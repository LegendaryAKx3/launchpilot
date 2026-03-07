from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.agents.research_agent import run_research_agent
from app.agents.shared_context import build_project_context
from app.db.session import get_db
from app.integrations.backboard_client import BackboardRequestError
from app.models.research import Competitor, OpportunityWedge, PainPointCluster, ResearchRun
from app.routers.utils import success
from app.schemas.research import ResearchRunRequest
from app.security.auth0 import CurrentUser
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.backboard_stage_service import BackboardStageService
from app.services.memory_service import upsert_project_memory
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/research", tags=["research"])


@router.post("/run")
def run_research(
    project_id: UUID,
    payload: ResearchRunRequest,
    _scope: CurrentUser = Depends(require_scope("research:run")),
    db: Session = Depends(get_db),
):
    project = ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    if payload.pinned_wedge_ids:
        context["pinned_wedge_ids"] = [str(item) for item in payload.pinned_wedge_ids]
    try:
        output, trace = run_research_agent(
            context,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
        )
    except BackboardRequestError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard research failed: {exc}")

    run = ResearchRun(
        project_id=project_id,
        status="succeeded",
        summary=output.get("summary"),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(run)

    db.execute(delete(Competitor).where(Competitor.project_id == project_id))
    db.execute(delete(PainPointCluster).where(PainPointCluster.project_id == project_id))
    db.execute(delete(OpportunityWedge).where(OpportunityWedge.project_id == project_id))

    for item in output.get("competitors", []):
        name = item.get("name")
        if not name:
            continue
        db.add(
            Competitor(
                project_id=project_id,
                name=name,
                positioning=item.get("positioning"),
                pricing_summary=item.get("pricing_summary"),
                strengths=item.get("strengths", []),
                weaknesses=item.get("weaknesses", []),
            )
        )

    for idx, item in enumerate(output.get("pain_point_clusters", []), start=1):
        label = item.get("label")
        if not label:
            continue
        db.add(
            PainPointCluster(
                project_id=project_id,
                label=label,
                description=item.get("description"),
                evidence=item.get("evidence", []),
                rank=idx,
            )
        )

    for item in output.get("opportunity_wedges", []):
        label = item.get("label")
        if not label:
            continue
        db.add(
            OpportunityWedge(
                project_id=project_id,
                label=label,
                description=item.get("description"),
                score=item.get("score"),
                status="candidate",
            )
        )

    upsert_project_memory(
        db,
        project_id,
        "recommended_wedge_candidates",
        {"wedges": [w["label"] for w in output.get("opportunity_wedges", [])]},
        "fact",
        "agent",
    )

    project.stage = "research"
    AuditService(db).log(
        project_id,
        "agent",
        "research_agent",
        "research.generated",
        "research_run",
        str(run.id),
        metadata={"agent_trace": trace, "mode": payload.mode, "advice": payload.advice},
    )

    db.commit()

    return success(
        {
            "agent_trace": trace,
            "run": {
                "id": str(run.id),
                "status": run.status,
                "summary": run.summary,
                "saturation_score": float(run.saturation_score or 0) if run.saturation_score is not None else None,
            },
            "competitors": output.get("competitors", []),
            "pain_point_clusters": output.get("pain_point_clusters", []),
            "opportunity_wedges": output.get("opportunity_wedges", []),
            "chat_message": output.get("chat_message", ""),
            "next_step_suggestion": output.get("next_step_suggestion", ""),
            "should_move_to_next_stage": bool(output.get("should_move_to_next_stage")),
            "next_stage": output.get("next_stage", "research"),
        }
    )


@router.post("/advise")
def advise_research(
    project_id: UUID,
    payload: ResearchRunRequest,
    _scope: CurrentUser = Depends(require_scope("research:run")),
    db: Session = Depends(get_db),
):
    return run_research(project_id=project_id, payload=payload, _scope=_scope, db=db)


@router.get("")
def get_research_snapshot(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    latest_run = (
        db.query(ResearchRun)
        .filter(ResearchRun.project_id == project_id)
        .order_by(ResearchRun.created_at.desc())
        .first()
    )
    competitors = db.query(Competitor).filter(Competitor.project_id == project_id).all()
    pains = db.query(PainPointCluster).filter(PainPointCluster.project_id == project_id).all()
    wedges = db.query(OpportunityWedge).filter(OpportunityWedge.project_id == project_id).all()

    return success(
        {
            "run": {
                "id": str(latest_run.id) if latest_run else None,
                "status": latest_run.status if latest_run else "not_started",
                "summary": latest_run.summary if latest_run else None,
                "saturation_score": float(latest_run.saturation_score or 0) if latest_run else None,
            },
            "competitors": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "url": c.url,
                    "category": c.category,
                    "positioning": c.positioning,
                    "pricing_summary": c.pricing_summary,
                    "strengths": c.strengths,
                    "weaknesses": c.weaknesses,
                }
                for c in competitors
            ],
            "pain_point_clusters": [
                {
                    "id": str(p.id),
                    "label": p.label,
                    "description": p.description,
                    "rank": p.rank,
                    "evidence": p.evidence,
                }
                for p in pains
            ],
            "opportunity_wedges": [
                {
                    "id": str(w.id),
                    "label": w.label,
                    "description": w.description,
                    "score": float(w.score or 0),
                    "status": w.status,
                }
                for w in wedges
            ],
        }
    )
