"""API integration tests using FastAPI TestClient and mocked dependencies."""
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def mock_db_session():
    session = AsyncMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=False)
    return session


@pytest.fixture
def mock_job():
    from braingui_api.models.job import Job, JobStatus
    job = MagicMock(spec=Job)
    job.id = "jb_test1234"
    job.video_url = "https://www.youtube.com/watch?v=test"
    job.sha256 = None
    job.status = JobStatus.queued
    job.progress_pct = 0
    job.duration_sec = None
    job.vertex_blob_key = None
    job.has_audio = True
    job.has_speech = True
    job.error_message = None
    job.created_at = datetime(2026, 4, 18, 12, 0, 0)
    job.updated_at = datetime(2026, 4, 18, 12, 0, 0)
    return job


@pytest.fixture
def app_client(mock_db_session, mock_job):
    from braingui_api.main import create_app
    from braingui_api.database import get_session

    mock_db_session.get = AsyncMock(return_value=mock_job)
    mock_db_session.add = MagicMock()
    mock_db_session.commit = AsyncMock()

    async def override_get_session():
        yield mock_db_session

    async def mock_create_pool(*args, **kwargs):
        pool = AsyncMock()
        pool.enqueue_job = AsyncMock()
        pool.close = AsyncMock()
        return pool

    app = create_app()
    app.dependency_overrides[get_session] = override_get_session

    with patch("arq.create_pool", mock_create_pool):
        client = TestClient(app, raise_server_exceptions=False)
        yield client, mock_db_session, mock_job

    app.dependency_overrides.clear()


class TestHealthEndpoint:
    def test_health_returns_ok(self):
        from braingui_api.main import create_app
        client = TestClient(create_app())
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestJobsRouter:
    def test_create_job_returns_202(self, app_client):
        client, _, _ = app_client
        with patch("arq.create_pool") as mock_pool_factory:
            mock_pool = AsyncMock()
            mock_pool.enqueue_job = AsyncMock()
            mock_pool.close = AsyncMock()
            mock_pool_factory.return_value = mock_pool
            response = client.post(
                "/api/v1/jobs",
                json={"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
            )
        assert response.status_code == 202
        data = response.json()
        assert "id" in data
        assert "shareUrl" in data
        assert data["id"].startswith("jb_")

    def test_get_job_returns_job(self, app_client):
        client, _, _ = app_client
        response = client.get("/api/v1/jobs/jb_test1234")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "jb_test1234"
        assert data["status"] == "queued"
        assert data["progressPct"] == 0

    def test_get_nonexistent_job_returns_404(self, app_client):
        client, mock_session, _ = app_client
        mock_session.get = AsyncMock(return_value=None)
        response = client.get("/api/v1/jobs/jb_doesnotexist")
        assert response.status_code == 404

    def test_vertex_url_on_incomplete_job_returns_409(self, app_client):
        client, _, mock_job = app_client
        from braingui_api.models.job import JobStatus
        mock_job.status = JobStatus.running_inference
        mock_job.vertex_blob_key = None
        response = client.get("/api/v1/jobs/jb_test1234/vertex-url")
        assert response.status_code == 409

    def test_vertex_url_on_complete_job_returns_presigned_url(self, app_client):
        client, _, mock_job = app_client
        from braingui_api.models.job import JobStatus
        mock_job.status = JobStatus.complete
        mock_job.vertex_blob_key = "jobs/jb_test1234/vertices.bin"
        with patch(
            "braingui_api.routers.jobs.generate_presigned_url",
            AsyncMock(return_value=("https://presigned.example.com/vertices.bin", "2026-04-18T13:15:00Z")),
        ):
            response = client.get("/api/v1/jobs/jb_test1234/vertex-url")
        assert response.status_code == 200
        data = response.json()
        assert data["url"] == "https://presigned.example.com/vertices.bin"
        assert "expiresAt" in data
