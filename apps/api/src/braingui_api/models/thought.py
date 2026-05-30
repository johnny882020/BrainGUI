from datetime import datetime

from sqlalchemy import Enum, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base

# Only state labels are persisted — never raw sensor data
_mental_state_enum = Enum(
    "focused", "relaxed", "excited", "stressed", "neutral", name="mental_state"
)
_intent_enum = Enum(
    "confirm", "reject", "left", "right", "idle", name="motor_intent"
)


class ThoughtLog(Base):
    """Audit log of transmitted ThoughtPackets. Labels + metadata only."""
    __tablename__ = "thought_logs"

    id: Mapped[str] = mapped_column(String(26), primary_key=True)
    sender_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    channel_id: Mapped[str] = mapped_column(ForeignKey("channels.id"), nullable=False)
    state: Mapped[str] = mapped_column(_mental_state_enum, nullable=False)
    intent: Mapped[str] = mapped_column(_intent_enum, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
