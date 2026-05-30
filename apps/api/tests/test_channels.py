import pytest

ALICE = {
    "username": "alice",
    "email": "alice@example.com",
    "password": "alicepass123",
    "public_key": "a" * 44,
}
BOB = {
    "username": "bob",
    "email": "bob@example.com",
    "password": "bobpass1234",
    "public_key": "b" * 44,
}


def _register_and_token(client, user):
    res = client.post("/api/v1/auth/register", json=user)
    return res.json()["accessToken"]


def test_create_channel(client):
    token = _register_and_token(client, ALICE)
    res = client.post(
        "/api/v1/channels",
        json={"name": "test-room"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert "inviteCode" in data
    assert len(data["inviteCode"]) == 8


def test_join_channel(client):
    alice_token = _register_and_token(client, ALICE)
    channel = client.post(
        "/api/v1/channels",
        json={"name": "shared-room"},
        headers={"Authorization": f"Bearer {alice_token}"},
    ).json()

    bob_token = _register_and_token(client, BOB)
    res = client.post(
        "/api/v1/channels/join",
        json={"invite_code": channel["inviteCode"]},
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert res.status_code == 200


def test_join_invalid_code(client):
    token = _register_and_token(client, ALICE)
    res = client.post(
        "/api/v1/channels/join",
        json={"invite_code": "XXXXXXXX"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 404


def test_list_channels(client):
    token = _register_and_token(client, ALICE)
    client.post(
        "/api/v1/channels", json={"name": "room1"}, headers={"Authorization": f"Bearer {token}"}
    )
    client.post(
        "/api/v1/channels", json={"name": "room2"}, headers={"Authorization": f"Bearer {token}"}
    )
    res = client.get("/api/v1/channels", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert len(res.json()) == 2


def test_channel_members(client):
    alice_token = _register_and_token(client, ALICE)
    channel = client.post(
        "/api/v1/channels",
        json={"name": "collab"},
        headers={"Authorization": f"Bearer {alice_token}"},
    ).json()

    bob_token = _register_and_token(client, BOB)
    client.post(
        "/api/v1/channels/join",
        json={"invite_code": channel["inviteCode"]},
        headers={"Authorization": f"Bearer {bob_token}"},
    )

    res = client.get(
        f"/api/v1/channels/{channel['id']}/members",
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert res.status_code == 200
    usernames = [m["username"] for m in res.json()]
    assert "alice" in usernames
    assert "bob" in usernames


def test_channel_requires_auth(client):
    res = client.post("/api/v1/channels", json={"name": "room"})
    assert res.status_code == 401
