from datetime import datetime

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    # Email stored as SHA-256 hash — never in plaintext in the DB
    email_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(72), nullable=False)
    # X25519 public key for E2E encryption (base64-encoded)
    public_key: Mapped[str] = mapped_column(String(44), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )
