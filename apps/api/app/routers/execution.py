import json
from datetime import datetime, timezone
from urllib.parse import quote_plus
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.agents.execution_agent import (
    run_asset_generation_agent,
    run_distribution_assets_agent,
    run_email_personalization_agent,
    run_execution_plan_agent,
    run_image_ad_prompt_agent,
)
from app.agents.shared_context import build_project_context
from app.db.session import get_db
from app.integrations.auth0_google_connector import Auth0GoogleConnector
from app.integrations.backboard_client import BackboardRequestError
from app.integrations.google_drive_client import GoogleDriveClient
from app.models.approval import Approval
from app.models.chat import AgentChatMessage
from app.models.execution import Asset, Contact, LaunchPlan, LaunchTask, OutboundBatch, OutboundMessage
from app.routers.utils import safe_commit, success
from app.schemas.execution import (
    AssetGenerationRequest,
    AssetUpdateRequest,
    ContactsUpsertRequest,
    ContactUpdateRequest,
    DriveWriteRequest,
    DistributionAssetsRequest,
    EmailBatchPrepareRequest,
    ExecutionPlanRequest,
    ImageAdDraftRequest,
    ImageAdRenderRequest,
    TaskUpdateRequest,
)
from app.security.auth0 import CurrentUser, get_current_user
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.backboard_project_state_service import BackboardProjectStateService
from app.services.backboard_stage_service import BackboardStageService
from app.services.execution_service import ExecutionService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/execution", tags=["execution"])


def _normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    return email.strip().lower()


def _get_current_launch_plan(db: Session, project_id: UUID) -> LaunchPlan | None:
    current = (
        db.query(LaunchPlan)
        .filter(LaunchPlan.project_id == project_id)
        .order_by(LaunchPlan.created_at.desc())
        .first()
    )
    if not current:
        return None

    # Clean up stale plans
    db.query(LaunchPlan).filter(
        LaunchPlan.project_id == project_id,
        LaunchPlan.id != current.id,
    ).delete(synchronize_session=False)
    db.flush()
    return current


def _replace_launch_tasks(db: Session, plan_id: str | UUID, tasks: list[dict]) -> None:
    db.query(LaunchTask).filter(LaunchTask.launch_plan_id == plan_id).delete()
    db.flush()

    for task in tasks:
        title = task.get("title")
        if not title:
            continue
        db.add(
            LaunchTask(
                launch_plan_id=plan_id,
                day_number=task.get("day_number"),
                title=title,
                description=task.get("description"),
                priority=task.get("priority", 3),
            )
        )


def _dedupe_assets(assets: list[Asset]) -> list[Asset]:
    seen: set[str] = set()
    deduped: list[Asset] = []
    for asset in assets:
        key = json.dumps(
            {
                "asset_type": asset.asset_type,
                "title": asset.title,
                "status": asset.status,
                "content": asset.content or {},
            },
            sort_keys=True,
            default=str,
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(asset)
    return deduped


def _dedupe_contacts(contacts: list[Contact]) -> list[Contact]:
    seen: set[str] = set()
    deduped: list[Contact] = []
    for contact in contacts:
        key = _normalize_email(contact.email) or str(contact.id)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(contact)
    return deduped


def _active_batches(batches: list[OutboundBatch]) -> list[OutboundBatch]:
    current_pending_seen = False
    filtered: list[OutboundBatch] = []
    for batch in batches:
        if batch.status in {"draft", "pending_approval"}:
            if current_pending_seen:
                continue
            current_pending_seen = True
        filtered.append(batch)
    return filtered


def _build_image_render_url(prompt: str) -> str:
    encoded = quote_plus(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded}?width=1024&height=1024&nologo=true&model=flux"


def _store_execution_assistant_reply(
    db: Session,
    *,
    project_id: UUID,
    content: str | None,
    mode: str | None = None,
    next_step_suggestion: str | None = None,
) -> None:
    text = (content or "").strip()
    if not text:
        return
    db.add(
        AgentChatMessage(
            project_id=str(project_id),
            agent_type="execution",
            role="assistant",
            content=text,
            message_metadata={
                "source": "agent_run",
                "mode": mode,
                "next_step_suggestion": next_step_suggestion,
            },
        )
    )


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
    try:
        output, trace = run_execution_plan_agent(
            context,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
        )
    except BackboardRequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard execution planning failed: {exc}")

    plan = _get_current_launch_plan(db, project_id)
    if plan:
        plan.positioning_version_id = str(payload.positioning_version_id) if payload.positioning_version_id else None
        plan.primary_channel = output["launch_strategy"]["primary_channel"]
        plan.secondary_channels = output["launch_strategy"]["secondary_channels"]
        plan.kpis = output.get("kpis", [])
        plan.status = "active"
    else:
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

    _replace_launch_tasks(db, plan.id, output.get("tasks", []))

    project.stage = "execution"
    AuditService(db).log(
        project_id,
        "agent",
        "execution_agent",
        "execution.plan_generated",
        "launch_plan",
        str(plan.id),
        metadata={"agent_trace": trace, "mode": payload.mode, "advice": payload.advice},
    )
    _store_execution_assistant_reply(
        db,
        project_id=project_id,
        content=output.get("chat_message"),
        mode=payload.mode,
        next_step_suggestion=output.get("next_step_suggestion"),
    )

    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.plan",
        stage="execution",
        extra={"mode": payload.mode, "used_advice": bool(payload.advice), "launch_plan_id": str(plan.id)},
    )
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
    try:
        output, trace = run_asset_generation_agent(
            context,
            payload.types,
            payload.count,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
        )
    except BackboardRequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard asset generation failed: {exc}")

    existing_drafts = (
        db.query(Asset)
        .filter(
            Asset.project_id == project_id,
            Asset.created_by_agent == "execution_agent",
            Asset.status == "draft",
            Asset.asset_type.in_(payload.types),
        )
        .all()
    )
    for asset in existing_drafts:
        db.delete(asset)
    db.flush()

    created_assets = []
    fallback_type = payload.types[0] if payload.types else "asset"
    for draft in output.get("assets", []):
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

    AuditService(db).log(
        project_id,
        "agent",
        "execution_agent",
        "execution.assets_generated",
        "asset",
        None,
        metadata={"agent_trace": trace, "mode": payload.mode, "advice": payload.advice, "count": len(created_assets)},
    )
    _store_execution_assistant_reply(
        db,
        project_id=project_id,
        content=output.get("chat_message"),
        mode=payload.mode,
        next_step_suggestion=output.get("next_step_suggestion"),
    )
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.assets",
        stage="execution",
        extra={"mode": payload.mode, "used_advice": bool(payload.advice), "asset_count": len(created_assets)},
    )
    return success(
        {
            "assets": created_assets,
            "chat_message": output.get("chat_message", ""),
            "next_step_suggestion": output.get("next_step_suggestion", ""),
            "should_move_to_next_stage": bool(output.get("should_move_to_next_stage")),
            "next_stage": output.get("next_stage", "execution"),
            "agent_trace": trace,
        }
    )


@router.post("/assets/advise")
def advise_assets(
    project_id: UUID,
    payload: AssetGenerationRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    return generate_assets(project_id=project_id, payload=payload, _scope=_scope, db=db)


@router.post("/distribution-assets")
def generate_distribution_assets(
    project_id: UUID,
    payload: DistributionAssetsRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    """Generate multiple distribution asset variations across channels (DMs, emails, image ads, video scripts)."""
    ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    try:
        output, trace = run_distribution_assets_agent(
            context,
            channels=payload.channels,
            variations_per_channel=payload.variations_per_channel,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
        )
    except BackboardRequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard distribution assets failed: {exc}")

    # Save each asset to the database
    created_assets = []
    for asset_data in output.get("assets", []):
        asset_type = asset_data.get("asset_type", "")
        # Map distribution types to storage types
        storage_type = {
            "cold_dm": "cold_dm",
            "cold_email": "email_copy",
            "image_ad_prompt": "image_ad",
            "video_script": "video_script",
        }.get(asset_type, asset_type)

        asset = Asset(
            project_id=project_id,
            asset_type=storage_type,
            title=asset_data.get("title") or f"{asset_type} variation",
            content={
                "channel": asset_data.get("channel", ""),
                "variation_label": asset_data.get("variation_label", "A"),
                "hook_angle": asset_data.get("hook_angle", ""),
                **asset_data.get("content", {}),
            },
            storage_path=None,
            created_by_agent="execution_agent",
            status="draft",
        )
        db.add(asset)
        db.flush()
        created_assets.append({
            "id": str(asset.id),
            "asset_type": storage_type,
            "title": asset.title,
            "status": asset.status,
            "content": asset.content,
        })

    AuditService(db).log(
        project_id,
        "agent",
        "execution_agent",
        "execution.distribution_assets_generated",
        "asset",
        None,
        metadata={"agent_trace": trace, "mode": payload.mode, "advice": payload.advice, "count": len(created_assets)},
    )
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.distribution_assets",
        stage="execution",
        extra={"mode": payload.mode, "used_advice": bool(payload.advice), "asset_count": len(created_assets)},
    )
    return success(
        {
            "recommended_channels": output.get("recommended_channels", []),
            "channel_reasoning": output.get("channel_reasoning", ""),
            "assets": created_assets,
            "testing_strategy": output.get("testing_strategy", ""),
            "chat_message": output.get("chat_message", ""),
            "next_step_suggestion": output.get("next_step_suggestion", ""),
            "agent_trace": trace,
        }
    )


@router.post("/image-ad/draft")
def generate_image_ad_draft(
    project_id: UUID,
    payload: ImageAdDraftRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    try:
        output, trace = run_image_ad_prompt_agent(
            context,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
        )
    except BackboardRequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard image ad prompt failed: {exc}")

    asset = Asset(
        project_id=project_id,
        asset_type="image_ad",
        title=output.get("title") or "Image Ad Draft",
        content={
            "generation_prompt": output.get("generation_prompt", ""),
        },
        storage_path=None,
        created_by_agent="execution_agent",
        status="draft",
    )
    db.add(asset)
    db.flush()

    AuditService(db).log(
        project_id,
        "agent",
        "execution_agent",
        "execution.image_ad_draft_generated",
        "asset",
        None,
        metadata={"agent_trace": trace, "mode": payload.mode, "advice": payload.advice, "asset_id": str(asset.id)},
    )
    _store_execution_assistant_reply(
        db,
        project_id=project_id,
        content=output.get("chat_message"),
        mode=payload.mode,
        next_step_suggestion=output.get("next_step_suggestion"),
    )
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.image_ad_draft",
        stage="execution",
        extra={"asset_id": str(asset.id), "mode": payload.mode, "used_advice": bool(payload.advice)},
    )
    return success(
        {
            "asset": {
                "id": str(asset.id),
                "asset_type": asset.asset_type,
                "status": asset.status,
                "title": asset.title,
                "content": asset.content,
                "storage_path": asset.storage_path,
            },
            "agent_trace": trace,
            "chat_message": output.get("chat_message", ""),
            "next_step_suggestion": output.get("next_step_suggestion", ""),
        }
    )


@router.post("/assets/{asset_id}/render-image")
def render_image_ad_asset(
    project_id: UUID,
    asset_id: UUID,
    payload: ImageAdRenderRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.project_id == project_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    if asset.asset_type != "image_ad":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Asset is not an image ad")

    content = dict(asset.content or {})
    prompt = (payload.prompt or "").strip() or str(content.get("generation_prompt") or "").strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing image generation prompt. Edit the image ad prompt first.",
        )

    image_url = _build_image_render_url(prompt)
    content["generation_prompt"] = prompt
    content["image_url"] = image_url
    content["generated_at"] = datetime.now(timezone.utc).isoformat()
    asset.content = content
    safe_commit(db)

    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.image_ad_render",
        stage="execution",
        extra={"asset_id": str(asset.id)},
    )
    return success({"asset_id": str(asset.id), "image_url": image_url, "updated": True})


@router.post("/contacts")
def upsert_contacts(
    project_id: UUID,
    payload: ContactsUpsertRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    # Bulk-fetch existing contacts for this project in one query
    incoming_emails = [_normalize_email(str(c.email)) for c in payload.contacts]
    existing_rows = (
        db.query(Contact)
        .filter(
            Contact.project_id == project_id,
            func.lower(Contact.email).in_([e for e in incoming_emails if e]),
        )
        .all()
    )
    existing_by_email: dict[str | None, Contact] = {}
    for row in existing_rows:
        key = _normalize_email(row.email)
        if key not in existing_by_email:
            existing_by_email[key] = row

    inserted_ids = []
    for contact in payload.contacts:
        normalized_email = _normalize_email(str(contact.email))
        row = existing_by_email.get(normalized_email)
        if row:
            row.name = contact.name
            row.email = normalized_email
            row.company = contact.company
            row.segment = contact.segment
            row.personalization_notes = contact.personalization_notes
        else:
            row = Contact(
                project_id=project_id,
                name=contact.name,
                email=normalized_email,
                company=contact.company,
                segment=contact.segment,
                personalization_notes=contact.personalization_notes,
            )
            db.add(row)
            db.flush()
            existing_by_email[normalized_email] = row
        inserted_ids.append(str(row.id))
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.contacts",
        stage="execution",
        extra={"contact_ids": inserted_ids},
    )
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
    try:
        output, trace = run_email_personalization_agent(
            context,
            subject_line=payload.subject_line,
            max_contacts=payload.max_contacts,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
        )
    except BackboardRequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard outreach draft failed: {exc}")

    drafts = output.get("drafts", [])
    if not drafts:
        BackboardProjectStateService(db).sync_after_action(
            project_id=str(project_id),
            reason="execution.email_prepare_empty",
            stage="execution",
            extra={"mode": payload.mode, "used_advice": bool(payload.advice)},
        )
        return success(
            {
                "prepared": False,
                "reason": "No contacts available",
                "chat_message": output.get("chat_message", ""),
                "next_step_suggestion": output.get("next_step_suggestion", ""),
                "should_move_to_next_stage": bool(output.get("should_move_to_next_stage")),
                "next_stage": output.get("next_stage", "execution"),
                "agent_trace": trace,
            }
        )

    valid_drafts = [item for item in drafts if item.get("contact_id") and item.get("body")]
    if not valid_drafts:
        BackboardProjectStateService(db).sync_after_action(
            project_id=str(project_id),
            reason="execution.email_prepare_invalid",
            stage="execution",
            extra={"mode": payload.mode, "used_advice": bool(payload.advice)},
        )
        return success(
            {
                "prepared": False,
                "reason": "No valid drafts generated",
                "chat_message": output.get("chat_message", ""),
                "next_step_suggestion": output.get("next_step_suggestion", ""),
                "should_move_to_next_stage": bool(output.get("should_move_to_next_stage")),
                "next_stage": output.get("next_stage", "execution"),
                "agent_trace": trace,
            }
        )

    existing_batches = (
        db.query(OutboundBatch)
        .filter(
            OutboundBatch.project_id == project_id,
            OutboundBatch.status.in_(["draft", "pending_approval"]),
        )
        .order_by(OutboundBatch.created_at.desc())
        .all()
    )
    batch = existing_batches[0] if existing_batches else None
    for stale_batch in existing_batches[1:]:
        db.query(Approval).filter(
            Approval.project_id == project_id,
            Approval.resource_type == "outbound_batch",
            Approval.resource_id == str(stale_batch.id),
            Approval.status == "pending",
        ).delete()
        db.delete(stale_batch)

    if batch:
        db.query(OutboundMessage).filter(OutboundMessage.batch_id == batch.id).delete()
        batch.status = "pending_approval"
        batch.subject_line = payload.subject_line
        batch.send_count = 0
        batch.approved_at = None
        batch.sent_at = None
    else:
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

    approval = (
        db.query(Approval)
        .filter(
            Approval.project_id == project_id,
            Approval.resource_type == "outbound_batch",
            Approval.resource_id == str(batch.id),
            Approval.status == "pending",
        )
        .order_by(Approval.created_at.desc())
        .first()
    )
    if approval:
        approval.action_type = "send_email_batch"
        approval.requested_by_agent = "execution_agent"
        approval.reason = "Ready to send outbound batch"
        approval.required_scope = "execution:send"
        approval.requires_step_up = False
    else:
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

    AuditService(db).log(
        project_id,
        "agent",
        "execution_agent",
        "execution.email_batch_prepared",
        "outbound_batch",
        str(batch.id),
        metadata={"agent_trace": trace, "mode": payload.mode, "advice": payload.advice, "messages_prepared": len(valid_drafts)},
    )
    _store_execution_assistant_reply(
        db,
        project_id=project_id,
        content=output.get("chat_message"),
        mode=payload.mode,
        next_step_suggestion=output.get("next_step_suggestion"),
    )

    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.email_prepare",
        stage="execution",
        extra={"mode": payload.mode, "used_advice": bool(payload.advice), "batch_id": str(batch.id)},
    )
    return success(
        {
            "batch_id": str(batch.id),
            "approval_id": str(approval.id),
            "prepared": True,
            "messages_prepared": len(valid_drafts),
            "chat_message": output.get("chat_message", ""),
            "next_step_suggestion": output.get("next_step_suggestion", ""),
            "should_move_to_next_stage": bool(output.get("should_move_to_next_stage")),
            "next_stage": output.get("next_stage", "approvals"),
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
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.email_send",
        stage="execution",
        extra={"batch_id": str(batch_id)},
    )
    return success(result)


@router.get("/state")
def get_execution_state(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    plans = (
        db.query(LaunchPlan)
        .filter(LaunchPlan.project_id == project_id)
        .order_by(LaunchPlan.created_at.desc())
        .limit(1)
        .all()
    )
    plan_ids = [plan.id for plan in plans]
    tasks = db.query(LaunchTask).filter(LaunchTask.launch_plan_id.in_(plan_ids)).order_by(LaunchTask.day_number.asc()).all() if plan_ids else []
    assets = _dedupe_assets(
        db.query(Asset).filter(Asset.project_id == project_id).order_by(Asset.created_at.desc()).all()
    )
    contacts = _dedupe_contacts(
        db.query(Contact).filter(Contact.project_id == project_id).order_by(Contact.created_at.desc()).all()
    )
    batches = _active_batches(
        db.query(OutboundBatch).filter(OutboundBatch.project_id == project_id).order_by(OutboundBatch.created_at.desc()).all()
    )
    batch_ids = [batch.id for batch in batches]
    messages = (
        db.query(OutboundMessage)
        .join(OutboundBatch, OutboundMessage.batch_id == OutboundBatch.id)
        .filter(OutboundBatch.project_id == project_id, OutboundBatch.id.in_(batch_ids))
        .all()
        if batch_ids
        else []
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
            "contacts": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "email": c.email,
                    "company": c.company,
                    "segment": c.segment,
                    "source": c.source,
                    "personalization_notes": c.personalization_notes,
                }
                for c in contacts
            ],
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
                    "body": m.body,
                    "contact_id": str(m.contact_id) if m.contact_id else None,
                    "error_message": m.error_message,
                }
                for m in messages
            ],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )


@router.patch("/tasks/{task_id}")
def update_task(
    project_id: UUID,
    task_id: UUID,
    payload: TaskUpdateRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    task = db.query(LaunchTask).filter(LaunchTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Verify task belongs to a plan owned by this project
    plan = db.query(LaunchPlan).filter(LaunchPlan.id == task.launch_plan_id, LaunchPlan.project_id == project_id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found in this project")

    if payload.title is not None:
        task.title = payload.title
    if payload.description is not None:
        task.description = payload.description
    if payload.day_number is not None:
        task.day_number = payload.day_number
    if payload.priority is not None:
        task.priority = payload.priority
    if payload.status is not None:
        task.status = payload.status

    safe_commit(db)
    return success({"task_id": str(task.id), "updated": True})


@router.patch("/assets/{asset_id}")
def update_asset(
    project_id: UUID,
    asset_id: UUID,
    payload: AssetUpdateRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.project_id == project_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    if payload.title is not None:
        asset.title = payload.title
    if payload.content is not None:
        asset.content = payload.content
    if payload.status is not None:
        asset.status = payload.status

    safe_commit(db)
    return success({"asset_id": str(asset.id), "updated": True})


@router.delete("/assets/{asset_id}")
def delete_asset(
    project_id: UUID,
    asset_id: UUID,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.project_id == project_id).first()
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    db.delete(asset)
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.asset_deleted",
        stage="execution",
        extra={"asset_id": str(asset_id)},
    )
    return success({"asset_id": str(asset_id), "deleted": True})


@router.patch("/contacts/{contact_id}")
def update_contact(
    project_id: UUID,
    contact_id: UUID,
    payload: ContactUpdateRequest,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.project_id == project_id).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    if payload.name is not None:
        contact.name = payload.name
    if payload.email is not None:
        contact.email = payload.email
    if payload.segment is not None:
        contact.segment = payload.segment
    if payload.company is not None:
        contact.company = payload.company
    if payload.personalization_notes is not None:
        contact.personalization_notes = payload.personalization_notes

    safe_commit(db)
    return success({"contact_id": str(contact.id), "updated": True})


@router.delete("/contacts/{contact_id}")
def delete_contact(
    project_id: UUID,
    contact_id: UUID,
    _scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.project_id == project_id).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    db.delete(contact)
    safe_commit(db)
    return success({"contact_id": str(contact_id), "deleted": True})


@router.post("/drive/write")
def write_to_google_drive(
    project_id: UUID,
    payload: DriveWriteRequest,
    current_user: CurrentUser = Depends(get_current_user),
    _run_scope: CurrentUser = Depends(require_scope("execution:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    connector = Auth0GoogleConnector()
    access_token = connector.google_access_token(current_user.sub)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GOOGLE_NOT_LINKED",
                "message": "Google account is not linked or delegated token is unavailable.",
            },
        )

    folder_id = payload.folder_id or None
    try:
        file_info = GoogleDriveClient().create_text_file(
            access_token=access_token,
            title=payload.title.strip(),
            content=payload.content,
            mime_type=payload.mime_type or "text/plain",
            folder_id=folder_id,
        )
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        error_message = "Failed to write file to Google Drive."
        try:
            body = exc.response.json()
            details = body.get("error", {}) if isinstance(body, dict) else {}
            message = details.get("message")
            if message:
                error_message = str(message)
        except Exception:  # noqa: BLE001
            pass

        if status_code in {401, 403}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "GOOGLE_TOKEN_INVALID",
                    "message": "Google access token is expired or missing Drive permission. Reconnect Google in Settings and try again.",
                },
            ) from exc

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "GOOGLE_DRIVE_WRITE_FAILED",
                "message": error_message,
            },
        ) from exc

    AuditService(db).log(
        project_id,
        "system",
        "google_drive_connector",
        "execution.google_drive_write",
        "external_file",
        str(file_info.get("id") or ""),
        metadata={
            "file_name": file_info.get("name"),
            "mime_type": file_info.get("mimeType"),
            "folder_id": folder_id,
        },
    )
    safe_commit(db)
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="execution.google_drive_write",
        stage="execution",
        extra={"file_id": file_info.get("id"), "file_name": file_info.get("name")},
    )
    return success({"written": True, "file": file_info})
