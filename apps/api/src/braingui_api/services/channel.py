import json
import secrets
import string

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.channel import Channel, ChannelMember
from ..models.user import User

logger = structlog.get_logger()

_ID_CHARS = string.ascii_letters + string.digits
_INVITE_CHARS = string.ascii_uppercase + string.digits


def _new_channel_id() -> str:
    return "ch_" + "".join(secrets.choice(_ID_CHARS) for _ in range(18))


def _new_invite_code() -> str:
    return "".join(secrets.choice(_INVITE_CHARS) for _ in range(8))


async def create_channel(db: AsyncSession, name: str, owner_id: str) -> Channel:
    channel = Channel(
        id=_new_channel_id(),
        name=name,
        invite_code=_new_invite_code(),
        owner_id=owner_id,
    )
    db.add(channel)
    member = ChannelMember(channel_id=channel.id, user_id=owner_id)
    db.add(member)
    await db.commit()
    await db.refresh(channel)
    return channel


async def join_channel(db: AsyncSession, invite_code: str, user_id: str) -> Channel:
    result = await db.execute(
        select(Channel).where(Channel.invite_code == invite_code.upper())
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise ValueError("channel not found")

    existing = await db.execute(
        select(ChannelMember).where(
            ChannelMember.channel_id == channel.id,
            ChannelMember.user_id == user_id,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(ChannelMember(channel_id=channel.id, user_id=user_id))
        await db.commit()
    return channel


async def get_channel_members(
    db: AsyncSession, channel_id: str
) -> list[tuple[User, ChannelMember]]:
    result = await db.execute(
        select(User, ChannelMember)
        .join(ChannelMember, ChannelMember.user_id == User.id)
        .where(ChannelMember.channel_id == channel_id)
    )
    return result.all()  # type: ignore[return-value]


async def user_in_channel(db: AsyncSession, channel_id: str, user_id: str) -> bool:
    result = await db.execute(
        select(ChannelMember).where(
            ChannelMember.channel_id == channel_id,
            ChannelMember.user_id == user_id,
        )
    )
    return result.scalar_one_or_none() is not None


# ─── In-memory WS connection registry ───────────────────────────────────────

from fastapi import WebSocket  # noqa: E402 (import after stdlib/third-party)


class ConnectionRegistry:
    """Tracks active WebSocket connections per channel."""

    def __init__(self) -> None:
        # channel_id → {user_id: websocket}
        self._rooms: dict[str, dict[str, WebSocket]] = {}

    def connect(self, channel_id: str, user_id: str, ws: WebSocket) -> None:
        self._rooms.setdefault(channel_id, {})[user_id] = ws

    def disconnect(self, channel_id: str, user_id: str) -> None:
        room = self._rooms.get(channel_id, {})
        room.pop(user_id, None)
        if not room:
            self._rooms.pop(channel_id, None)

    async def broadcast(
        self, channel_id: str, message: dict, exclude_user: str | None = None
    ) -> None:
        room = self._rooms.get(channel_id, {})
        for uid, ws in list(room.items()):
            if uid == exclude_user:
                continue
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                logger.warning("ws_send_failed", channel_id=channel_id)

    def member_count(self, channel_id: str) -> int:
        return len(self._rooms.get(channel_id, {}))


registry = ConnectionRegistry()
