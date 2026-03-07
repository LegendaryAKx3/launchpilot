from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.approval import Approval
from app.routers.utils import success
from app.schemas.approval import ApprovalDecisionRequest
from app.security.auth0 import CurrentUser, get_current_user
from app.security.permissions import require_scope

router = APIRouter(tags=["approvals"])


@router.get("/projects/{project_id}/approvals")
def list_approvals(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("approval:read")),
    db: Session = Depends(get_db),
):
    approvals = (
        db.query(Approval)
        .filter(Approval.project_id == project_id)
        .order_by(Approval.created_at.desc())
        .all()
    )
    return success(
        [
            {
                "id": str(a.id),
                "action_type": a.action_type,
                "resource_type": a.resource_type,
                "resource_id": str(a.resource_id) if a.resource_id else None,
                "status": a.status,
                "reason": a.reason,
                "required_scope": a.required_scope,
                "requires_step_up": a.requires_step_up,
                "approved_at": a.approved_at,
                "rejected_at": a.rejected_at,
                "created_at": a.created_at,
            }
            for a in approvals
        ]
    )


@router.post("/approvals/{approval_id}/approve")
def approve(
    approval_id: UUID,
    payload: ApprovalDecisionRequest,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("approval:write")),
    db: Session = Depends(get_db),
):
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    required_scope = approval.required_scope
    if required_scope and required_scope not in current_user.scopes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Missing scope: {required_scope}")

    approval.status = "approved"
    approval.approved_at = datetime.now(timezone.utc)
    approval.rejected_at = None
    if payload.reason:
        approval.reason = payload.reason

    db.commit()
    return success({"approval_id": str(approval.id), "status": approval.status})


@router.post("/approvals/{approval_id}/reject")
def reject(
    approval_id: UUID,
    payload: ApprovalDecisionRequest,
    _scope: CurrentUser = Depends(require_scope("approval:write")),
    db: Session = Depends(get_db),
):
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Approval not found")

    approval.status = "rejected"
    approval.rejected_at = datetime.now(timezone.utc)
    if payload.reason:
        approval.reason = payload.reason
    db.commit()
    return success({"approval_id": str(approval.id), "status": approval.status})
