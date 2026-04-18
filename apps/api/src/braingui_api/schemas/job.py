from datetime import datetime

from pydantic import BaseModel, HttpUrl

from ..models.job import JobStatus


class CreateJobRequest(BaseModel):
    videoUrl: str


class JobResponse(BaseModel):
    id: str
    videoUrl: str
    sha256: str | None
    status: JobStatus
    progressPct: int
    durationSec: float | None
    vertexBlobUrl: str | None
    hasAudio: bool
    hasSpeech: bool
    errorMessage: str | None
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}


class CreateJobResponse(BaseModel):
    id: str
    shareUrl: str


class VertexUrlResponse(BaseModel):
    url: str
    expiresAt: str
