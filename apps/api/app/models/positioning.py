from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, UUIDPrimaryKeyMixin


class PositioningVersion(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "positioning_versions"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    selected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    icp: Mapped[str] = mapped_column(Text, nullable=False)
    wedge: Mapped[str] = mapped_column(Text, nullable=False)
    positioning_statement: Mapped[str] = mapped_column(Text, nullable=False)
    headline: Mapped[str | None] = mapped_column(Text)
    subheadline: Mapped[str | None] = mapped_column(Text)
    benefits: Mapped[list] = mapped_column(JSON, default=list)
    pricing_direction: Mapped[str | None] = mapped_column(Text)
    objection_handling: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
