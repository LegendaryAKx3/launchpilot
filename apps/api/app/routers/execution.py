from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agents.execution_agent import run_asset_generation_agent, run_email_personalization_agent, run_execution_plan_agent
from app.agents.shared_context import build_project_context
from app.db.session import get_db
from app.models.approval import Approval
from app.models.execution import Asset, Contact, LaunchPlan, LaunchTask, OutboundBatch, OutboundMessage
from app.routers.utils import success
from app.schemas.execution import AssetGenerationRequest, ContactsUpsertRequest, EmailBatchPrepareRequest, ExecutionPlanRequest
from app.security.auth0 import CurrentUser
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.backboard_stage_service import BackboardStageService
from app.services.execution_service import ExecutionService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/execution", tags=["execution"])


@router.post("/plan")
def generate_execution_plan(
    project_id: UUID,
    payload: ExecutionPlanRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    project = ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    if payload.positioning_version_id:
        context["selected_positioning_version_id"] = str(payload.positioning_version_id)
    output, trace = run_execution_plan_agent(
        context,
        backboard=BackboardStageService(db),
        project_id=str(project_id),
        advice=payload.advice,
        mode=payload.mode,
    )

    plan = LaunchPlan(
        project_id=project_id,
        positioning_version_id=str(payload.positioning_version_id) if payload.positioning_version_id else None,
        primary_channel=output["launch_strategy"]["primary_channel"],
        secondary_channels=output["launch_strategy"]["secondary_channels"],
        kpis=output.get("kpis", []),
        status="active",
    )
    db.add(plan)
    db.flush()

    for task in output.get("tasks", []):
        db.add(
            LaunchTask(
                launch_plan_id=plan.id,
                day_number=task.get("day_number"),
                title=task["title"],
                description=task.get("description"),
                priority=task.get("priority", 3),
            )
        )

    project.stage = "execution"
    AuditService(db).log(project_id, "agent", "execution_agent", "execution.plan_generated", "launch_plan", str(plan.id))

    db.commit()
    return success({"launch_plan_id": str(plan.id), "agent_trace": trace, **output})


@router.post("/plan/advise")
def advise_execution_plan(
    project_id: UUID,
    payload: ExecutionPlanRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    return generate_execution_plan(project_id=project_id, payload=payload, _scope=_scope, db=db)


@router.post("/assets")
def generate_assets(
    project_id: UUID,
    payload: AssetGenerationRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    drafts, trace = run_asset_generation_agent(
        context,
        payload.types,
        payload.count,
        backboard=BackboardStageService(db),
        project_id=str(project_id),
        advice=payload.advice,
        mode=payload.mode,
    )

    created_assets = []
    fallback_type = payload.types[0] if payload.types else "asset"
    for draft in drafts:
        asset = Asset(
            project_id=project_id,
            asset_type=draft.get("asset_type") or fallback_type,
            title=draft.get("title"),
            content=draft.get("content", {}),
            storage_path=None,
            created_by_agent="execution_agent",
            status="draft",
        )
        db.add(asset)
        db.flush()
        created_assets.append(
            {
                "id": str(asset.id),
                "asset_type": asset.asset_type,
                "title": asset.title,
                "status": asset.status,
                "content": asset.content,
            }
        )

    AuditService(db).log(project_id, "agent", "execution_agent", "execution.assets_generated", "asset", None)
    db.commit()
    return success({"assets": created_assets, "agent_trace": trace})


@router.post("/assets/advise")
def advise_assets(
    project_id: UUID,
    payload: AssetGenerationRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    return generate_assets(project_id=project_id, payload=payload, _scope=_scope, db=db)


@router.post("/contacts")
def upsert_contacts(
    project_id: UUID,
    payload: ContactsUpsertRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    inserted_ids = []
    for contact in payload.contacts:
        row = Contact(project_id=project_id, **contact.model_dump())
        db.add(row)
        db.flush()
        inserted_ids.append(str(row.id))
    db.commit()
    return success({"contact_ids": inserted_ids})


@router.post("/email-batch/prepare")
def prepare_email_batch(
    project_id: UUID,
    payload: EmailBatchPrepareRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    drafts, trace = run_email_personalization_agent(
        context,
        subject_line=payload.subject_line,
        max_contacts=payload.max_contacts,
        backboard=BackboardStageService(db),
        project_id=str(project_id),
        advice=payload.advice,
        mode=payload.mode,
    )

    if not drafts:
        return success({"prepared": False, "reason": "No contacts available", "agent_trace": trace})

    valid_drafts = [item for item in drafts if item.get("contact_id") and item.get("body")]
    if not valid_drafts:
        return success({"prepared": False, "reason": "No valid drafts generated", "agent_trace": trace})

    batch = OutboundBatch(project_id=project_id, status="pending_approval", subject_line=payload.subject_line)
    db.add(batch)
    db.flush()

    for draft in valid_drafts:
        db.add(
            OutboundMessage(
                batch_id=batch.id,
                contact_id=draft["contact_id"],
                subject=draft.get("subject") or payload.subject_line,
                body=draft["body"],
                status="draft",
            )
        )

    approval = Approval(
        project_id=project_id,
        action_type="send_email_batch",
        resource_type="outbound_batch",
        resource_id=str(batch.id),
        status="pending",
        requested_by_agent="execution_agent",
        reason="Ready to send outbound batch",
        required_scope="execution:send",
        requires_step_up=False,
    )
    db.add(approval)

    AuditService(db).log(project_id, "agent", "execution_agent", "execution.email_batch_prepared", "outbound_batch", str(batch.id))

    db.commit()
    return success(
        {
            "batch_id": str(batch.id),
            "approval_id": str(approval.id),
            "prepared": True,
            "messages_prepared": len(valid_drafts),
            "agent_trace": trace,
        }
    )


@router.post("/email-batch/prepare/advise")
def advise_email_batch_prepare(
    project_id: UUID,
    payload: EmailBatchPrepareRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    return prepare_email_batch(project_id=project_id, payload=payload, _scope=_scope, db=db)


@router.post("/email-batch/{batch_id}/send")
def send_email_batch(
    project_id: UUID,
    batch_id: UUID,
    _scope: CurrentUser = Depends(require_scope("execution:send")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    batch = db.query(OutboundBatch).filter(OutboundBatch.id == batch_id, OutboundBatch.project_id == project_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found")

    approval = (
        db.query(Approval)
        .filter(
            Approval.project_id == project_id,
            Approval.resource_type == "outbound_batch",
            Approval.resource_id == str(batch_id),
            Approval.status == "approved",
        )
        .first()
    )
    if not approval:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Batch not approved")

    result = ExecutionService(db).send_email_batch(project_id, batch_id)
    AuditService(db).log(project_id, "system", "api", "execution.email_batch_sent", "outbound_batch", str(batch_id))
    db.commit()
    return success(result)


@router.get("/state")
def get_execution_state(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    plans = db.query(LaunchPlan).filter(LaunchPlan.project_id == project_id).order_by(LaunchPlan.created_at.desc()).all()
    plan_ids = [plan.id for plan in plans]
    tasks = db.query(LaunchTask).filter(LaunchTask.launch_plan_id.in_(plan_ids)).order_by(LaunchTask.day_number.asc()).all() if plan_ids else []
    assets = db.query(Asset).filter(Asset.project_id == project_id).order_by(Asset.created_at.desc()).all()
    contacts = db.query(Contact).filter(Contact.project_id == project_id).all()
    batches = db.query(OutboundBatch).filter(OutboundBatch.project_id == project_id).order_by(OutboundBatch.created_at.desc()).all()
    messages = (
        db.query(OutboundMessage)
        .join(OutboundBatch, OutboundMessage.batch_id == OutboundBatch.id)
        .filter(OutboundBatch.project_id == project_id)
        .all()
    )

    return success(
        {
            "plans": [
                {
                    "id": str(plan.id),
                    "positioning_version_id": str(plan.positioning_version_id) if plan.positioning_version_id else None,
                    "primary_channel": plan.primary_channel,
                    "secondary_channels": plan.secondary_channels,
                    "kpis": plan.kpis,
                    "status": plan.status,
                }
                for plan in plans
            ],
            "tasks": [
                {
                    "id": str(task.id),
                    "launch_plan_id": str(task.launch_plan_id),
                    "day_number": task.day_number,
                    "title": task.title,
                    "description": task.description,
                    "status": task.status,
                    "priority": task.priority,
                }
                for task in tasks
            ],
            "assets": [
                {
                    "id": str(a.id),
                    "asset_type": a.asset_type,
                    "status": a.status,
                    "title": a.title,
                    "content": a.content,
                    "storage_path": a.storage_path,
                }
                for a in assets
            ],
            "contacts": [{"id": str(c.id), "name": c.name, "email": c.email, "segment": c.segment} for c in contacts],
            "batches": [
                {
                    "id": str(b.id),
                    "status": b.status,
                    "subject_line": b.subject_line,
                    "send_count": b.send_count,
                    "approved_at": b.approved_at,
                    "sent_at": b.sent_at,
                }
                for b in batches
            ],
            "messages": [
                {
                    "id": str(m.id),
                    "batch_id": str(m.batch_id),
                    "status": m.status,
                    "subject": m.subject,
                    "error_message": m.error_message,
                }
                for m in messages
            ],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )
