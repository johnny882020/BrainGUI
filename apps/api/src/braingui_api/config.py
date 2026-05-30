import base64
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./brainlink.db"
    redis_url: str = "redis://localhost:6379/0"

    jwt_private_key_b64: str = ""
    jwt_public_key_b64: str = ""
    jwt_algorithm: str = "RS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    cors_origins: list[str] = ["http://localhost:8081", "exp://localhost:8081"]
    app_env: str = "development"

    @field_validator("database_url", mode="before")
    @classmethod
    def rewrite_postgres_scheme(cls, v: str) -> str:
        # Render/Heroku supply postgres:// but asyncpg needs postgresql+asyncpg://
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    @property
    def jwt_private_key(self) -> str:
        if not self.jwt_private_key_b64:
            return ""
        return base64.b64decode(self.jwt_private_key_b64).decode()

    @property
    def jwt_public_key(self) -> str:
        if not self.jwt_public_key_b64:
            return ""
        return base64.b64decode(self.jwt_public_key_b64).decode()


@lru_cache
def get_settings() -> Settings:
    return Settings()
