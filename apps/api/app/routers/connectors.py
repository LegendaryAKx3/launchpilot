from __future__ import annotations

from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.integrations.auth0_github_connector import Auth0GithubConnector
from app.integrations.auth0_google_connector import Auth0GoogleConnector
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
    return_to = quote("/app/settings/security", safe="")
    github_scope = quote("repo,user:email", safe="")
    link_url = (
        f"{app_url}/auth/login?connection=github"
        f"&connection_scope={github_scope}"
        f"&returnTo={return_to}"
    )
    return success({"url": link_url})


@router.get("/connectors/google/status")
def google_status(
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("connector:link")),
):
    connector = Auth0GoogleConnector()
    status_payload = connector.google_status(current_user.sub)
    return success(status_payload)


@router.get("/connectors/google/link-url")
def google_link_url(
    _current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("connector:link")),
):
    settings = get_settings()
    app_url = settings.web_app_url.rstrip("/")
    return_to = quote("/app/settings/security", safe="")
    drive_scope = quote("https://www.googleapis.com/auth/drive.file", safe="")
    link_url = (
        f"{app_url}/auth/login?connection=google-oauth2"
        f"&connection_scope={drive_scope}"
        f"&prompt=consent"
        f"&access_type=offline"
        f"&returnTo={return_to}"
    )
    return success({"url": link_url})


@router.get("/connectors/debug")
def connectors_debug(
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("connector:link")),
):
    github = Auth0GithubConnector()
    google = Auth0GoogleConnector()

    github_profile = github._user_profile(current_user.sub) or {}
    google_profile = google._user_profile(current_user.sub) or {}

    def summarize_identities(profile: dict) -> list[dict]:
        out: list[dict] = []
        for identity in profile.get("identities", []) if isinstance(profile.get("identities"), list) else []:
            if not isinstance(identity, dict):
                continue
            provider = str(identity.get("provider", "")).lower()
            if provider not in {"github", "google-oauth2"}:
                continue
            out.append(
                {
                    "provider": provider,
                    "provider_user_id": identity.get("user_id"),
                    "has_access_token": bool(identity.get("access_token")),
                }
            )
        return out

    email = str(github_profile.get("email") or google_profile.get("email") or "").strip().lower()
    github_candidates = github._users_by_email(email) if email else []
    google_candidates = google._users_by_email(email) if email else []

    def summarize_candidates(candidates: list[dict], connector, provider: str) -> list[dict]:
        rows: list[dict] = []
        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            user_id = str(candidate.get("user_id", "")).strip()
            if not user_id:
                continue
            profile = connector._user_profile(user_id) or {}
            identities = summarize_identities(profile)
            provider_identity = next((i for i in identities if i.get("provider") == provider), None)
            rows.append(
                {
                    "user_id": user_id,
                    "email": profile.get("email"),
                    "email_verified": bool(profile.get("email_verified")),
                    "provider_present": provider_identity is not None,
                    "provider_has_access_token": bool(provider_identity and provider_identity.get("has_access_token")),
                }
            )
        return rows

    payload = {
        "current_user": {
            "sub": current_user.sub,
            "email": current_user.email,
        },
        "management": {
            "github_management_token_available": bool(github._management_token()),
            "google_management_token_available": bool(google._management_token()),
        },
        "current_profile": {
            "email": github_profile.get("email") or google_profile.get("email"),
            "email_verified": bool(github_profile.get("email_verified") or google_profile.get("email_verified")),
            "identities": summarize_identities(github_profile or google_profile),
        },
        "resolved_status": {
            "github": github.github_status(current_user.sub),
            "google": google.google_status(current_user.sub),
        },
        "candidates_by_email": {
            "email": email or None,
            "github_candidates": summarize_candidates(github_candidates, github, "github"),
            "google_candidates": summarize_candidates(google_candidates, google, "google-oauth2"),
        },
    }
    return success(payload)


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
