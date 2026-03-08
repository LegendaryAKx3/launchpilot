"""Compatibility revision for environments already stamped with 0003.

Revision ID: 0003_add_chat_sequence_field
Revises: 0002_add_agent_chat_messages
"""

from __future__ import annotations

# revision identifiers, used by Alembic.
revision = "0003_add_chat_sequence_field"
down_revision = "0002_add_agent_chat_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op: preserves migration lineage for existing local DBs.
    pass


def downgrade() -> None:
    pass
