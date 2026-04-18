from datetime import datetime

from pydantic import BaseModel, field_validator

from ..models.job import JobStatus


class CreateJobRequest(BaseModel):
    videoUrl: str

    @field_validator("videoUrl")
    @classmethod
    def validate_video_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("videoUrl must not be empty")
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("videoUrl must start with http:// or https://")
        if len(v) > 2048:
            raise ValueError("videoUrl exceeds maximum length")
        return v


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
