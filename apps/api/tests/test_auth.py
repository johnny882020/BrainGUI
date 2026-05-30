import pytest

VALID_USER = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "strongpass123",
    "public_key": "a" * 44,
}


def test_register_success(client):
    res = client.post("/api/v1/auth/register", json=VALID_USER)
    assert res.status_code == 201
    data = res.json()
    assert "accessToken" in data
    assert "refreshToken" in data
    assert data["userId"].startswith("u_")


def test_register_duplicate_username(client):
    client.post("/api/v1/auth/register", json=VALID_USER)
    res = client.post("/api/v1/auth/register", json=VALID_USER)
    assert res.status_code == 409


def test_register_weak_password(client):
    body = {**VALID_USER, "password": "short"}
    res = client.post("/api/v1/auth/register", json=body)
    assert res.status_code == 422


def test_login_success(client):
    client.post("/api/v1/auth/register", json=VALID_USER)
    res = client.post(
        "/api/v1/auth/login",
        json={"email": VALID_USER["email"], "password": VALID_USER["password"]},
    )
    assert res.status_code == 200
    assert "accessToken" in res.json()


def test_login_wrong_password(client):
    client.post("/api/v1/auth/register", json=VALID_USER)
    res = client.post(
        "/api/v1/auth/login",
        json={"email": VALID_USER["email"], "password": "wrongpassword"},
    )
    assert res.status_code == 401


def test_refresh_token_rotation(client):
    reg = client.post("/api/v1/auth/register", json=VALID_USER).json()
    old_refresh = reg["refreshToken"]

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert res.status_code == 200
    new_tokens = res.json()
    assert "accessToken" in new_tokens
    assert "refreshToken" in new_tokens
    assert new_tokens["refreshToken"] != old_refresh

    # Old refresh token should be invalidated
    res2 = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert res2.status_code == 401


def test_logout(client):
    reg = client.post("/api/v1/auth/register", json=VALID_USER).json()
    # httpx TestClient supports json= on all methods via request()
    res = client.request(
        "DELETE",
        "/api/v1/auth/logout",
        json={"refresh_token": reg["refreshToken"]},
    )
    assert res.status_code == 204

    res2 = client.post("/api/v1/auth/refresh", json={"refresh_token": reg["refreshToken"]})
    assert res2.status_code == 401


def test_health(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}
