from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "projects"
    __table_args__ = (UniqueConstraint("workspace_id", "slug", name="uq_workspace_project_slug"),)

    workspace_id: Mapped[str] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    slug: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text)
    stage: Mapped[str] = mapped_column(String, nullable=False, default="idea")
    goal: Mapped[str | None] = mapped_column(Text)
    product_type: Mapped[str | None] = mapped_column(String)
    website_url: Mapped[str | None] = mapped_column(String)
    repo_url: Mapped[str | None] = mapped_column(String)
    target_market_hint: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))


class ProjectBrief(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "project_briefs"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    raw_brief: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_problem: Mapped[str | None] = mapped_column(Text)
    parsed_audience: Mapped[str | None] = mapped_column(Text)
    parsed_constraints: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProjectSource(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "project_sources"

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str | None] = mapped_column(String)
    storage_path: Mapped[str | None] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="ready")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ProjectMemory(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "project_memory"
    __table_args__ = (
        UniqueConstraint("project_id", "memory_key", name="uq_project_memory_key"),
        Index("ix_project_memory_project_id", "project_id"),
    )

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    memory_key: Mapped[str] = mapped_column(String, nullable=False)
    memory_value: Mapped[dict] = mapped_column(JSON, nullable=False)
    memory_type: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False)
