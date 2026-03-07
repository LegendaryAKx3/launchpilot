from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.approval import ActivityEvent
from app.models.project import Project, ProjectBrief, ProjectMemory, ProjectSource
from app.models.workspace import WorkspaceMember
from app.routers.utils import success
from app.schemas.project import ProjectBriefUpsertRequest, ProjectCreateRequest, ProjectSourceCreateRequest
from app.security.auth0 import CurrentUser, get_current_user
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("")
def list_projects(
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    project_service = ProjectService(db)
    user = project_service.get_or_create_local_user(current_user)

    rows = (
        db.query(Project)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Project.workspace_id)
        .filter(WorkspaceMember.user_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )

    return success(
        [
            {
                "id": str(project.id),
                "workspace_id": str(project.workspace_id),
                "name": project.name,
                "slug": project.slug,
                "summary": project.summary,
                "stage": project.stage,
                "goal": project.goal,
                "status": project.status,
            }
            for project in rows
        ]
    )


@router.post("")
def create_project(
    payload: ProjectCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    project_service = ProjectService(db)
    actor = project_service.get_or_create_local_user(current_user)
    workspace = project_service.get_or_create_default_workspace(actor)

    slug = project_service.next_available_project_slug(workspace.id, payload.name)

    project = Project(
        workspace_id=workspace.id,
        name=payload.name,
        slug=slug,
        summary=payload.summary,
        goal=payload.goal,
        website_url=payload.website_url,
        repo_url=payload.repo_url,
        target_market_hint=payload.target_market_hint,
        created_by=actor.id,
        stage="idea",
    )
    db.add(project)
    db.flush()

    AuditService(db).log(project.id, "system", None, "project.created", "project", str(project.id))

    db.commit()
    return success({"project_id": str(project.id), "slug": project.slug})


@router.get("/{project_id}")
def get_project(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    project = ProjectService(db).get_project_or_404(project_id)
    return success(
        {
            "id": str(project.id),
            "workspace_id": str(project.workspace_id),
            "name": project.name,
            "slug": project.slug,
            "summary": project.summary,
            "stage": project.stage,
            "goal": project.goal,
            "website_url": project.website_url,
            "repo_url": project.repo_url,
            "status": project.status,
        }
    )


@router.delete("/{project_id}")
def delete_project(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    project = ProjectService(db).get_project_or_404(project_id)

    db.query(ProjectMemory).filter(ProjectMemory.project_id == project_id).delete()
    db.query(ProjectSource).filter(ProjectSource.project_id == project_id).delete()
    db.query(ProjectBrief).filter(ProjectBrief.project_id == project_id).delete()
    db.query(ActivityEvent).filter(ActivityEvent.project_id == project_id).delete()

    db.delete(project)
    db.commit()

    return success({"deleted": True})


@router.post("/{project_id}/brief")
def upsert_project_brief(
    project_id: UUID,
    payload: ProjectBriefUpsertRequest,
    _scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    brief = (
        db.query(ProjectBrief)
        .filter(ProjectBrief.project_id == project_id)
        .order_by(ProjectBrief.created_at.desc())
        .first()
    )
    if brief:
        brief.raw_brief = payload.raw_brief
        brief.parsed_problem = payload.parsed_problem
        brief.parsed_audience = payload.parsed_audience
        brief.parsed_constraints = payload.parsed_constraints
    else:
        brief = ProjectBrief(
            project_id=project_id,
            raw_brief=payload.raw_brief,
            parsed_problem=payload.parsed_problem,
            parsed_audience=payload.parsed_audience,
            parsed_constraints=payload.parsed_constraints,
        )
        db.add(brief)
    db.commit()
    return success({"brief_id": str(brief.id)})


@router.post("/{project_id}/sources")
def add_project_source(
    project_id: UUID,
    payload: ProjectSourceCreateRequest,
    _scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    source = ProjectSource(
        project_id=project_id,
        source_type=payload.source_type,
        url=payload.url,
        storage_path=payload.storage_path,
        title=payload.title,
    )
    db.add(source)
    db.commit()
    return success({"source_id": str(source.id)})


@router.get("/{project_id}/memory")
def get_project_memory(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    memory_rows = (
        db.query(ProjectMemory)
        .filter(ProjectMemory.project_id == project_id)
        .order_by(ProjectMemory.updated_at.desc())
        .all()
    )
    return success(
        [
            {
                "id": str(row.id),
                "key": row.memory_key,
                "value": row.memory_value,
                "memory_type": row.memory_type,
                "source": row.source,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }
            for row in memory_rows
        ]
    )


@router.get("/{project_id}/activity")
def get_project_activity(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    rows = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(100)
        .all()
    )
    return success(
        [
            {
                "id": str(row.id),
                "actor_type": row.actor_type,
                "actor_id": row.actor_id,
                "verb": row.verb,
                "object_type": row.object_type,
                "object_id": row.object_id,
                "metadata": row.event_metadata,
                "created_at": row.created_at,
            }
            for row in rows
        ]
    )
