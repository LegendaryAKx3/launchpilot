from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.agents.research_agent import run_research_agent
from app.agents.shared_context import build_project_context
from app.db.session import get_db
from app.integrations.auth0_github_connector import Auth0GithubConnector
from app.integrations.backboard_client import BackboardRequestError
from app.integrations.github_client import GitHubClient
from app.models.research import Competitor, OpportunityWedge, PainPointCluster, ResearchRun
from app.routers.utils import success
from app.schemas.research import ResearchRunRequest
from app.security.auth0 import CurrentUser, get_current_user
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.backboard_stage_service import BackboardStageService
from app.services.memory_service import upsert_project_memory
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/research", tags=["research"])
TEXT_FILE_EXTENSIONS = {
    ".md",
    ".txt",
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".sql",
}


def _is_text_candidate(path: str) -> bool:
    lowered = path.lower()
    return any(lowered.endswith(ext) for ext in TEXT_FILE_EXTENSIONS)


def _build_verified_github_context(
    *,
    access_token: str,
    owner: str,
    repo: str,
    branch: str | None,
    path: str | None,
    max_files: int,
    max_file_chars: int,
) -> dict[str, Any]:
    client = GitHubClient()
    try:
        repo_info = client.get_repo(access_token, owner, repo)
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code if exc.response else status.HTTP_502_BAD_GATEWAY
        if code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "GITHUB_REPO_UNAVAILABLE",
                    "message": "Repository was not found or is not accessible with current GitHub authorization.",
                },
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "GITHUB_VERIFY_FAILED", "message": "Failed verifying repository with GitHub."},
        ) from exc

    selected_branch = (branch or "").strip() or (repo_info.get("default_branch") or "")
    if selected_branch:
        try:
            branch_info = client.get_branch(access_token, owner, repo, selected_branch)
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code if exc.response else status.HTTP_502_BAD_GATEWAY
            if code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "GITHUB_BRANCH_NOT_FOUND", "message": f"Branch '{selected_branch}' not found."},
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": "GITHUB_VERIFY_FAILED", "message": "Failed verifying branch with GitHub."},
            ) from exc
    else:
        branch_info = {"name": None, "sha": None}

    selected_path = (path or "").strip().lstrip("/")
    try:
        entries = client.list_path_contents(
            access_token,
            owner,
            repo,
            path=selected_path,
            ref=selected_branch or None,
        )
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code if exc.response else status.HTTP_502_BAD_GATEWAY
        if code == status.HTTP_404_NOT_FOUND:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "GITHUB_PATH_NOT_FOUND",
                    "message": f"Path '{selected_path or '/'}' not found in repository.",
                },
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "GITHUB_VERIFY_FAILED", "message": "Failed verifying repository path with GitHub."},
        ) from exc

    file_entries = [entry for entry in entries if entry.get("type") == "file" and _is_text_candidate(entry.get("path", ""))]
    selected_files = file_entries[:max_files]
    file_snippets: list[dict[str, Any]] = []
    for entry in selected_files:
        file_path = entry.get("path")
        if not file_path:
            continue
        text = client.get_file_text(
            access_token,
            owner,
            repo,
            path=file_path,
            ref=selected_branch or None,
            max_chars=max_file_chars,
        )
        if not text:
            continue
        file_snippets.append(
            {
                "path": file_path,
                "size": entry.get("size"),
                "snippet": text,
            }
        )

    if not file_snippets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GITHUB_NO_CONTEXT_FILES",
                "message": "No readable text files found at the specified repository path.",
            },
        )

    return {
        "verified_repo": True,
        "repo": repo_info,
        "branch": branch_info,
        "path": selected_path or "/",
        "files": file_snippets,
        "files_considered": len(file_entries),
        "files_included": len(file_snippets),
    }


@router.post("/run")
def run_research(
    project_id: UUID,
    payload: ResearchRunRequest,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("research:run")),
    db: Session = Depends(get_db),
):
    project = ProjectService(db).get_project_or_404(project_id)

    context = build_project_context(db, project_id)
    extra_task_instructions: str | None = None
    github_repo_context = {"included": False, "reason": "not_requested"}
    if payload.github_repo:
        if "repo:read" not in current_user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "MISSING_SCOPE", "message": "repo:read scope is required for GitHub repo context."},
            )
        connector = Auth0GithubConnector()
        token = connector.github_access_token(current_user.sub)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "GITHUB_NOT_LINKED", "message": "GitHub is not linked for this user."},
            )

        github_repo_context = _build_verified_github_context(
            access_token=token,
            owner=payload.github_repo.owner,
            repo=payload.github_repo.repo,
            branch=payload.github_repo.branch,
            path=payload.github_repo.path,
            max_files=payload.github_repo.max_files,
            max_file_chars=payload.github_repo.max_file_chars,
        )
        context["github_repo"] = github_repo_context
        extra_task_instructions = (
            "Use only the verified GitHub repository context in github_repo.files. "
            "If context is missing for a requested file, state that limitation explicitly."
        )

    if "repo:read" in current_user.scopes:
        connector = Auth0GithubConnector()
        token = connector.github_access_token(current_user.sub)
        if token:
            try:
                repos = GitHubClient().list_user_repos(token, per_page=20)
                github_repo_context = {
                    "included": True,
                    "repo_count": len(repos),
                }
                context["github"] = {
                    "repos": repos,
                    "note": "GitHub repositories linked through Auth0 identity.",
                }
            except Exception as exc:  # noqa: BLE001
                github_repo_context = {"included": False, "reason": f"github_fetch_failed:{exc}"}
        else:
            github_repo_context = {"included": False, "reason": "github_not_linked"}
    else:
        github_repo_context = {"included": False, "reason": "missing_repo_read_scope"}

    if payload.pinned_wedge_ids:
        context["pinned_wedge_ids"] = [str(item) for item in payload.pinned_wedge_ids]
    try:
        output, trace = run_research_agent(
            context,
            backboard=BackboardStageService(db),
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
            extra_task_instructions=extra_task_instructions,
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
        metadata={
            "agent_trace": trace,
            "mode": payload.mode,
            "advice": payload.advice,
            "github_repo_context": github_repo_context,
        },
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
            "github_repo_context": github_repo_context,
        }
    )


@router.post("/advise")
def advise_research(
    project_id: UUID,
    payload: ResearchRunRequest,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("research:run")),
    db: Session = Depends(get_db),
):
    return run_research(project_id=project_id, payload=payload, current_user=current_user, _scope=_scope, db=db)


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
