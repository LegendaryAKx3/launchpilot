from __future__ import annotations

from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.integrations.auth0_github_connector import Auth0GithubConnector
from app.integrations.github_client import GitHubClient
from app.routers.utils import success
from app.security.auth0 import CurrentUser, get_current_user
from app.security.permissions import require_scope
from app.services.memory_service import upsert_project_memory
from app.services.project_service import ProjectService

router = APIRouter(tags=["connectors"])


@router.get("/connectors/github/status")
def github_status(
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("connector:link")),
):
    connector = Auth0GithubConnector()
    status_payload = connector.github_status(current_user.sub)
    return success(status_payload)


@router.get("/connectors/github/link-url")
def github_link_url(
    _current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("connector:link")),
):
    settings = get_settings()
    app_url = settings.web_app_url.rstrip("/")
    # This uses the existing Auth0 route handler in the web app.
    link_url = f"{app_url}/auth/login?connection=github&returnTo={quote('/app/settings/security', safe='')}"
    return success({"url": link_url})


@router.get("/projects/{project_id}/github/repos")
def list_github_repos_for_project(
    project_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("repo:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    connector = Auth0GithubConnector()
    token = connector.github_access_token(current_user.sub)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GITHUB_NOT_LINKED",
                "message": "GitHub account is not linked or delegated token is unavailable.",
            },
        )

    try:
        repos = GitHubClient().list_user_repos(token)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "GITHUB_FETCH_FAILED",
                "message": f"Failed to fetch GitHub repositories: {exc}",
            },
        ) from exc

    return success({"project_id": str(project_id), "repos": repos})


@router.post("/projects/{project_id}/github/sync")
def sync_github_repos_for_project(
    project_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    _read_scope: CurrentUser = Depends(require_scope("repo:read")),
    _write_scope: CurrentUser = Depends(require_scope("project:write")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)

    connector = Auth0GithubConnector()
    token = connector.github_access_token(current_user.sub)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GITHUB_NOT_LINKED",
                "message": "GitHub account is not linked or delegated token is unavailable.",
            },
        )

    try:
        repos = GitHubClient().list_user_repos(token, per_page=50)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "code": "GITHUB_FETCH_FAILED",
                "message": f"Failed to fetch GitHub repositories: {exc}",
            },
        ) from exc

    upsert_project_memory(
        db,
        project_id,
        "github_repos_snapshot",
        {"repos": repos, "count": len(repos)},
        "integration_data",
        "auth0_github",
    )
    db.commit()

    return success({"project_id": str(project_id), "synced_repo_count": len(repos)})
