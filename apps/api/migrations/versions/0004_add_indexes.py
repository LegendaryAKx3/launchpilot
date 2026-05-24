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
    op.create_index("ix_contacts_project_id", "contacts", ["project_id"], if_not_exists=True)
    op.create_index("ix_contacts_email", "contacts", ["email"], if_not_exists=True)
    op.create_index("ix_contacts_project_email", "contacts", ["project_id", "email"], if_not_exists=True)
    op.create_index("ix_outbound_messages_batch_id", "outbound_messages", ["batch_id"], if_not_exists=True)
    op.create_index("ix_outbound_batches_project_id", "outbound_batches", ["project_id"], if_not_exists=True)
    op.create_index("ix_launch_plans_project_id", "launch_plans", ["project_id"], if_not_exists=True)
    op.create_index("ix_launch_tasks_plan_id", "launch_tasks", ["launch_plan_id"], if_not_exists=True)
    op.create_index("ix_assets_project_id", "assets", ["project_id"], if_not_exists=True)
    op.create_index("ix_project_memory_project_id", "project_memory", ["project_id"], if_not_exists=True)
    op.create_index("ix_workspace_members_workspace_id", "workspace_members", ["workspace_id"], if_not_exists=True)
    op.create_index("ix_workspace_members_user_id", "workspace_members", ["user_id"], if_not_exists=True)
    op.create_index("ix_approvals_project_id", "approvals", ["project_id"], if_not_exists=True)
    op.create_index("ix_activity_events_project_id", "activity_events", ["project_id"], if_not_exists=True)
    op.create_index("ix_agent_chat_project_agent", "agent_chat_messages", ["project_id", "agent_type"], if_not_exists=True)


def downgrade() -> None:
    op.drop_index("ix_agent_chat_project_agent", "agent_chat_messages", if_exists=True)
    op.drop_index("ix_activity_events_project_id", "activity_events", if_exists=True)
    op.drop_index("ix_approvals_project_id", "approvals", if_exists=True)
    op.drop_index("ix_workspace_members_user_id", "workspace_members", if_exists=True)
    op.drop_index("ix_workspace_members_workspace_id", "workspace_members", if_exists=True)
    op.drop_index("ix_project_memory_project_id", "project_memory", if_exists=True)
    op.drop_index("ix_assets_project_id", "assets", if_exists=True)
    op.drop_index("ix_launch_tasks_plan_id", "launch_tasks", if_exists=True)
    op.drop_index("ix_launch_plans_project_id", "launch_plans", if_exists=True)
    op.drop_index("ix_outbound_batches_project_id", "outbound_batches", if_exists=True)
    op.drop_index("ix_outbound_messages_batch_id", "outbound_messages", if_exists=True)
    op.drop_index("ix_contacts_project_email", "contacts", if_exists=True)
    op.drop_index("ix_contacts_email", "contacts", if_exists=True)
    op.drop_index("ix_contacts_project_id", "contacts", if_exists=True)
