from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.agents.positioning_agent import run_positioning_agent
from app.agents.shared_context import build_project_context
from app.db.session import get_db
from app.models.positioning import PositioningVersion
from app.routers.utils import success
from app.schemas.positioning import PositioningRunRequest
from app.security.auth0 import CurrentUser
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.memory_service import upsert_project_memory
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/positioning", tags=["positioning"])


@router.post("/run")
def run_positioning(
    project_id: UUID,
    payload: PositioningRunRequest,
    _scope: CurrentUser = Depends(require_scope("positioning:run")),
    db: Session = Depends(get_db),
):
    _ = payload
    project = ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    output = run_positioning_agent(context)

    version = PositioningVersion(
        project_id=project_id,
        icp=output["recommended_icp"],
        wedge=output["recommended_wedge"],
        positioning_statement=output["positioning_statement"],
        headline=output.get("headline"),
        subheadline=output.get("subheadline"),
        benefits=output.get("benefits", []),
        pricing_direction=output.get("pricing_direction"),
        objection_handling=output.get("objection_handling", []),
    )
    db.add(version)
    db.flush()

    project.stage = "positioning"
    AuditService(db).log(project_id, "agent", "positioning_agent", "positioning.generated", "positioning_version", str(version.id))

    db.commit()
    return success({"positioning_version_id": str(version.id), **output})


@router.get("")
def get_positioning(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    versions = (
        db.query(PositioningVersion)
        .filter(PositioningVersion.project_id == project_id)
        .order_by(PositioningVersion.created_at.desc())
        .all()
    )

    return success(
        {
            "versions": [
                {
                    "id": str(v.id),
                    "selected": v.selected,
                    "icp": v.icp,
                    "wedge": v.wedge,
                    "positioning_statement": v.positioning_statement,
                    "headline": v.headline,
                    "subheadline": v.subheadline,
                    "benefits": v.benefits,
                    "pricing_direction": v.pricing_direction,
                    "objection_handling": v.objection_handling,
                }
                for v in versions
            ]
        }
    )


@router.post("/select/{version_id}")
def select_positioning_version(
    project_id: UUID,
    version_id: UUID,
    _scope: CurrentUser = Depends(require_scope("positioning:run")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    version = (
        db.query(PositioningVersion)
        .filter(PositioningVersion.project_id == project_id, PositioningVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Positioning version not found")

    db.execute(update(PositioningVersion).where(PositioningVersion.project_id == project_id).values(selected=False))
    version.selected = True

    memory_value = {
        "version_id": str(version.id),
        "icp": version.icp,
        "wedge": version.wedge,
        "headline": version.headline,
    }
    upsert_project_memory(db, project_id, "selected_positioning", memory_value, "decision", "user")
    db.commit()
    return success({"selected_version_id": str(version.id)})
