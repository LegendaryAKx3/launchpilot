"""add indexes for frequently queried columns

Revision ID: 0004_add_indexes
Revises: 0003_add_chat_sequence_field
Create Date: 2026-03-21
"""

from alembic import op

revision = "0004_add_indexes"
down_revision = "0003_add_chat_sequence_field"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_contacts_project_id", "contacts", ["project_id"])
    op.create_index("ix_contacts_email", "contacts", ["email"])
    op.create_index("ix_contacts_project_email", "contacts", ["project_id", "email"])
    op.create_index("ix_outbound_messages_batch_id", "outbound_messages", ["batch_id"])
    op.create_index("ix_outbound_batches_project_id", "outbound_batches", ["project_id"])
    op.create_index("ix_launch_plans_project_id", "launch_plans", ["project_id"])
    op.create_index("ix_launch_tasks_plan_id", "launch_tasks", ["launch_plan_id"])
    op.create_index("ix_assets_project_id", "assets", ["project_id"])
    op.create_index("ix_project_memory_project_id", "project_memory", ["project_id"])
    op.create_index("ix_workspace_members_workspace_id", "workspace_members", ["workspace_id"])
    op.create_index("ix_workspace_members_user_id", "workspace_members", ["user_id"])
    op.create_index("ix_approvals_project_id", "approvals", ["project_id"])
    op.create_index("ix_activity_events_project_id", "activity_events", ["project_id"])
    op.create_index("ix_agent_chat_project_agent", "agent_chat_messages", ["project_id", "agent_type"])


def downgrade() -> None:
    op.drop_index("ix_agent_chat_project_agent", "agent_chat_messages")
    op.drop_index("ix_activity_events_project_id", "activity_events")
    op.drop_index("ix_approvals_project_id", "approvals")
    op.drop_index("ix_workspace_members_user_id", "workspace_members")
    op.drop_index("ix_workspace_members_workspace_id", "workspace_members")
    op.drop_index("ix_project_memory_project_id", "project_memory")
    op.drop_index("ix_assets_project_id", "assets")
    op.drop_index("ix_launch_tasks_plan_id", "launch_tasks")
    op.drop_index("ix_launch_plans_project_id", "launch_plans")
    op.drop_index("ix_outbound_batches_project_id", "outbound_batches")
    op.drop_index("ix_outbound_messages_batch_id", "outbound_messages")
    op.drop_index("ix_contacts_project_email", "contacts")
    op.drop_index("ix_contacts_email", "contacts")
    op.drop_index("ix_contacts_project_id", "contacts")
