from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    invite_code: Mapped[str] = mapped_column(String(8), unique=True, nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class ChannelMember(Base):
    __tablename__ = "channel_members"

    channel_id: Mapped[str] = mapped_column(
        ForeignKey("channels.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    joined_at: Mapped[datetime] = mapped_column(server_default=func.now())
