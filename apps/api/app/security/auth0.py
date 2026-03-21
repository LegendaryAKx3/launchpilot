from __future__ import annotations

import time
from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt

from app.core.config import Settings, get_settings

_JWKS_CACHE_TTL = 3600  # Re-fetch JWKS every hour to handle key rotation
_jwks_cache: dict[str, tuple[dict, float]] = {}


@dataclass(slots=True)
class CurrentUser:
    sub: str
    email: str | None
    name: str | None
    org_id: str | None
    workspace_role: str | None
    scopes: set[str]
    allowed_actions: list[str]
    raw_claims: dict


def _fetch_jwks(jwks_url: str) -> dict:
    now = time.monotonic()
    cached = _jwks_cache.get(jwks_url)
    if cached and (now - cached[1]) < _JWKS_CACHE_TTL:
        return cached[0]
    with httpx.Client(timeout=10.0) as client:
        data = client.get(jwks_url).json()
    _jwks_cache[jwks_url] = (data, now)
    return data


def _namespace(settings: Settings) -> str:
    return settings.app_jwt_namespace.rstrip("/") + "/"


def _decode_token(token: str, settings: Settings) -> dict:
    issuer = settings.auth0_issuer
    audience = settings.auth0_audience
    if not issuer or not audience:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Auth0 is not configured")

    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
    jwks = _fetch_jwks(jwks_url)
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            # Key not found — maybe keys rotated; invalidate cache and retry once
            _jwks_cache.pop(jwks_url, None)
            jwks = _fetch_jwks(jwks_url)
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if not key:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Signing key not found")
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            audience=audience,
            issuer=issuer,
        )
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc


def _dev_user() -> CurrentUser:
    return CurrentUser(
        sub="auth0|dev-user",
        email="dev@growthlaunchpad.app",
        name="Dev User",
        org_id=None,
        workspace_role="owner",
        scopes={
            "project:read",
            "project:write",
            "research:run",
            "positioning:run",
            "execution:run",
            "approval:read",
            "approval:write",
            "execution:send",
            "connector:link",
            "repo:read",
            "repo:write",
            "drive:write",
        },
        allowed_actions=["approve_send", "publish_asset"],
        raw_claims={},
    )


def get_current_user(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if settings.auth_mode.lower() == "dev":
        return _dev_user()

    if settings.auth_mode.lower() != "auth0":
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unsupported AUTH_MODE")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    token = authorization.split(" ", 1)[1]
    claims = _decode_token(token, settings)
    ns = _namespace(settings)

    scope_claim = claims.get("scope", "")
    scopes = set(scope_claim.split()) if scope_claim else set()
    permission_claim = claims.get("permissions", [])
    if isinstance(permission_claim, list):
        scopes.update(str(item) for item in permission_claim if isinstance(item, str))
    return CurrentUser(
        sub=claims.get("sub", ""),
        email=claims.get("email"),
        name=claims.get("name"),
        org_id=claims.get(f"{ns}org_id") or claims.get("org_id"),
        workspace_role=claims.get(f"{ns}workspace_role") or "owner",
        scopes=scopes,
        allowed_actions=claims.get(f"{ns}allowed_actions", []),
        raw_claims=claims,
    )
