import json

import structlog
from fastapi import APIRouter, Depends, Header, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.channel import Channel
from ..models.thought import ThoughtLog
from ..redis_client import get_redis
from ..services import auth as auth_svc
from ..services.channel import (
    create_channel,
    get_channel_members,
    join_channel,
    registry,
    user_in_channel,
)

logger = structlog.get_logger()
router = APIRouter(prefix="/api/v1/channels", tags=["channels"])


# ─── Dependency: authenticated user ─────────────────────────────────────────

def _extract_bearer(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    return authorization[7:]


async def get_current_user(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> str:
    if authorization is None:
        raise HTTPException(status_code=401, detail="missing authorization header")
    token = _extract_bearer(authorization)
    try:
        return auth_svc.decode_access_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="invalid token")


# ─── REST endpoints ──────────────────────────────────────────────────────────

class CreateChannelBody(BaseModel):
    name: str


class JoinChannelBody(BaseModel):
    invite_code: str


@router.post("", status_code=status.HTTP_201_CREATED)
async def create(
    body: CreateChannelBody,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    channel = await create_channel(db, body.name, user_id)
    return {
        "id": channel.id,
        "name": channel.name,
        "inviteCode": channel.invite_code,
        "createdAt": channel.created_at.isoformat(),
    }


@router.post("/join")
async def join(
    body: JoinChannelBody,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    try:
        channel = await join_channel(db, body.invite_code, user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="channel not found")
    return {"channelId": channel.id, "name": channel.name}


@router.get("")
async def list_channels(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    from ..models.channel import ChannelMember

    result = await db.execute(
        select(Channel)
        .join(ChannelMember, ChannelMember.channel_id == Channel.id)
        .where(ChannelMember.user_id == user_id)
    )
    channels = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "inviteCode": c.invite_code,
            "activeMembers": registry.member_count(c.id),
            "createdAt": c.created_at.isoformat(),
        }
        for c in channels
    ]


@router.get("/{channel_id}/members")
async def members(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    if not await user_in_channel(db, channel_id, user_id):
        raise HTTPException(status_code=403, detail="not a member")
    rows = await get_channel_members(db, channel_id)
    return [
        {
            "userId": user.id,
            "username": user.username,
            "publicKey": user.public_key,
            "joinedAt": member.joined_at.isoformat(),
        }
        for user, member in rows
    ]


# ─── WebSocket relay ─────────────────────────────────────────────────────────

_WS_MESSAGE_LIMIT = 60  # messages per minute per connection


@router.websocket("/{channel_id}/ws")
async def channel_ws(
    channel_id: str,
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    try:
        user_id = auth_svc.decode_access_token(token)
    except JWTError:
        await websocket.close(code=4001)
        return

    if not await user_in_channel(db, channel_id, user_id):
        await websocket.close(code=4003)
        return

    await websocket.accept()
    registry.connect(channel_id, user_id, websocket)

    # Announce presence to peers
    user = await auth_svc.get_user_by_id(db, user_id)
    if user:
        await registry.broadcast(
            channel_id,
            {"type": "peer_joined", "userId": user_id, "username": user.username, "publicKey": user.public_key},
            exclude_user=user_id,
        )

    msg_count = 0
    import asyncio
    reset_task = asyncio.create_task(_rate_reset(lambda: None))  # placeholder

    try:
        async for raw in _ws_iter(websocket):
            msg_count += 1
            if msg_count > _WS_MESSAGE_LIMIT:
                await websocket.close(code=4029)
                break
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "thought":
                # Relay encrypted payload to recipient or broadcast
                recipient_id = msg.get("recipientId")
                relay = {
                    "type": "thought",
                    "senderId": user_id,
                    "encryptedPayload": msg.get("encryptedPayload", ""),
                    "nonce": msg.get("nonce", ""),
                }
                await registry.broadcast(
                    channel_id,
                    relay,
                    exclude_user=user_id if recipient_id is None else None,
                )
                # Log labels only (server decrypts nothing)
                if state := msg.get("statePlaintext"):  # optional unencrypted label for logging
                    _log_thought(db, user_id, channel_id, state, msg.get("intent", "idle"), msg.get("confidence", 0.0))

            elif msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        reset_task.cancel()
        registry.disconnect(channel_id, user_id)
        await registry.broadcast(
            channel_id,
            {"type": "peer_left", "userId": user_id},
        )
        logger.info("ws_disconnected", channel_id=channel_id)


async def _ws_iter(ws: WebSocket):
    while True:
        try:
            yield await ws.receive_text()
        except WebSocketDisconnect:
            return


async def _rate_reset(reset_fn) -> None:
    import asyncio
    while True:
        await asyncio.sleep(60)
        reset_fn()


def _log_thought(db, sender_id, channel_id, state, intent, confidence):
    import asyncio
    import secrets

    async def _insert():
        log = ThoughtLog(
            id="tl_" + secrets.token_hex(10),
            sender_id=sender_id,
            channel_id=channel_id,
            state=state,
            intent=intent,
            confidence=confidence,
        )
        db.add(log)
        await db.commit()

    asyncio.ensure_future(_insert())
