from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, UUIDPrimaryKeyMixin


class AgentChatMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "agent_chat_messages"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    agent_type: Mapped[str] = mapped_column(String, nullable=False)  # research, positioning, execution
    role: Mapped[str] = mapped_column(String, nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
