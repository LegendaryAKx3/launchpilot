from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.chat import AgentChatMessage
from app.routers.utils import safe_commit, success
from app.security.auth0 import CurrentUser
from app.security.permissions import require_scope
from app.services.backboard_project_state_service import BackboardProjectStateService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/chat", tags=["chat"])


class ChatMessageCreate(BaseModel):
    role: str
    content: str
    metadata: dict | None = None

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if len(v) > 50_000:
            raise ValueError("Message content must be 50,000 characters or fewer")
        return v


class ChatMessagesCreate(BaseModel):
    messages: list[ChatMessageCreate]


@router.get("/{agent_type}")
def get_chat_messages(
    project_id: UUID,
    agent_type: str,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    messages = (
        db.query(AgentChatMessage)
        .filter(
            AgentChatMessage.project_id == str(project_id),
            AgentChatMessage.agent_type == agent_type,
        )
        .order_by(AgentChatMessage.created_at.asc())
        .all()
    )

    return success({
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "metadata": m.message_metadata,
                "timestamp": m.created_at.isoformat(),
            }
            for m in messages
        ]
    })


@router.post("/{agent_type}")
def save_chat_messages(
    project_id: UUID,
    agent_type: str,
    payload: ChatMessagesCreate,
    _scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    saved = []
    for msg in payload.messages:
        message = AgentChatMessage(
            project_id=str(project_id),
            agent_type=agent_type,
            role=msg.role,
            content=msg.content,
            message_metadata=msg.metadata,
        )
        db.add(message)
        db.flush()
        saved.append({
            "id": str(message.id),
            "role": message.role,
            "content": message.content,
            "metadata": message.message_metadata,
            "timestamp": message.created_at.isoformat(),
        })

    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason=f"chat.save.{agent_type}",
        stage=agent_type,
        extra={"message_count": len(saved)},
    )

    return success({"messages": saved})


@router.delete("/{agent_type}")
def clear_chat_messages(
    project_id: UUID,
    agent_type: str,
    _scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    db.query(AgentChatMessage).filter(
        AgentChatMessage.project_id == str(project_id),
        AgentChatMessage.agent_type == agent_type,
    ).delete()

    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason=f"chat.clear.{agent_type}",
        stage=agent_type,
        extra={"cleared": True},
    )

    return success({"cleared": True})
