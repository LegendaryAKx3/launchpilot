"""add agent chat messages table

Revision ID: 0002_add_agent_chat_messages
Revises: 0001_initial_schema
Create Date: 2026-03-07
"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0002_add_agent_chat_messages"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("agent_type", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_chat_messages_project_agent", "agent_chat_messages", ["project_id", "agent_type"])


def downgrade() -> None:
    op.drop_index("ix_agent_chat_messages_project_agent", table_name="agent_chat_messages")
    op.drop_table("agent_chat_messages")
