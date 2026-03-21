from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LaunchPlan(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "launch_plans"
    __table_args__ = (Index("ix_launch_plans_project_id", "project_id"),)

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    positioning_version_id: Mapped[str | None] = mapped_column(ForeignKey("positioning_versions.id"))
    primary_channel: Mapped[str | None] = mapped_column(String)
    secondary_channels: Mapped[list] = mapped_column(JSON, default=list)
    kpis: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LaunchTask(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "launch_tasks"
    __table_args__ = (Index("ix_launch_tasks_plan_id", "launch_plan_id"),)

    launch_plan_id: Mapped[str] = mapped_column(ForeignKey("launch_plans.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    day_number: Mapped[int | None] = mapped_column()
    status: Mapped[str] = mapped_column(String, nullable=False, default="todo")
    priority: Mapped[int] = mapped_column(nullable=False, default=3)


class Asset(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "assets"
    __table_args__ = (Index("ix_assets_project_id", "project_id"),)

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    asset_type: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    title: Mapped[str | None] = mapped_column(String)
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    storage_path: Mapped[str | None] = mapped_column(String)
    created_by_agent: Mapped[str | None] = mapped_column(String)


class Contact(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "contacts"
    __table_args__ = (
        Index("ix_contacts_project_id", "project_id"),
        Index("ix_contacts_email", "email"),
        Index("ix_contacts_project_email", "project_id", "email"),
    )

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str | None] = mapped_column(String)
    email: Mapped[str | None] = mapped_column(String)
    company: Mapped[str | None] = mapped_column(String)
    segment: Mapped[str | None] = mapped_column(String)
    personalization_notes: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String, default="manual")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OutboundBatch(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "outbound_batches"
    __table_args__ = (Index("ix_outbound_batches_project_id", "project_id"),)

    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    asset_id: Mapped[str | None] = mapped_column(ForeignKey("assets.id"))
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    subject_line: Mapped[str | None] = mapped_column(Text)
    send_count: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OutboundMessage(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "outbound_messages"
    __table_args__ = (Index("ix_outbound_messages_batch_id", "batch_id"),)

    batch_id: Mapped[str] = mapped_column(ForeignKey("outbound_batches.id", ondelete="CASCADE"), nullable=False)
    contact_id: Mapped[str] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False)
    subject: Mapped[str | None] = mapped_column(Text)
    body: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, nullable=False, default="draft")
    provider_message_id: Mapped[str | None] = mapped_column(String)
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
