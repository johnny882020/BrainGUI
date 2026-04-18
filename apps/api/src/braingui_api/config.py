from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://braingui:braingui_dev@localhost:5432/braingui"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Cloudflare R2 / S3
    r2_endpoint_url: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "braingui"
    r2_public_base_url: str = ""

    # Hugging Face Space
    hf_space_url: str = ""
    hf_token: str = ""

    # App
    app_base_url: str = "http://localhost:8000"
    cors_origins: list[str] = ["http://localhost:5173", "https://braingui.app"]

    @field_validator("database_url", mode="before")
    @classmethod
    def _fix_db_url(cls, v: str) -> str:
        """Rewrite Render's postgres:// scheme to the asyncpg driver string."""
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        if v.startswith("postgresql://") and "+asyncpg" not in v:
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v


settings = Settings()
