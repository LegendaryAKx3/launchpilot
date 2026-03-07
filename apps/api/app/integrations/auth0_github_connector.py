from __future__ import annotations

from urllib.parse import quote

import httpx

from app.core.config import get_settings


class Auth0GithubConnector:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.domain = (self.settings.auth0_domain or "").strip() or self._domain_from_issuer()
        self.management_audience = (
            self.settings.auth0_management_audience
            or (f"https://{self.domain}/api/v2/" if self.domain else None)
        )
        self._management_token_cache: str | None = None

    def _domain_from_issuer(self) -> str | None:
        issuer = self.settings.auth0_issuer or ""
        return issuer.replace("https://", "").replace("http://", "").strip().rstrip("/") or None

    def _management_token(self) -> str | None:
        if self._management_token_cache:
            return self._management_token_cache

        if (
            not self.domain
            or not self.management_audience
            or not self.settings.auth0_m2m_client_id
            or not self.settings.auth0_m2m_client_secret
        ):
            return None

        payload = {
            "grant_type": "client_credentials",
            "client_id": self.settings.auth0_m2m_client_id,
            "client_secret": self.settings.auth0_m2m_client_secret,
            "audience": self.management_audience,
        }
        with httpx.Client(timeout=15.0) as client:
            response = client.post(f"https://{self.domain}/oauth/token", json=payload)
            if not response.is_success:
                return None
            token = response.json().get("access_token")
            if not token:
                return None
            self._management_token_cache = token
            return token

    def _user_profile(self, user_sub: str) -> dict | None:
        token = self._management_token()
        if not token or not self.domain:
            return None

        encoded_sub = quote(user_sub, safe="")
        fields = "identities,user_id,email,name"
        with httpx.Client(timeout=15.0) as client:
            response = client.get(
                f"https://{self.domain}/api/v2/users/{encoded_sub}",
                params={"fields": fields, "include_fields": "true"},
                headers={"Authorization": f"Bearer {token}"},
            )
            if not response.is_success:
                return None
            return response.json()

    def github_identity(self, user_sub: str) -> dict | None:
        profile = self._user_profile(user_sub)
        if not profile:
            return None

        identities = profile.get("identities", [])
        for identity in identities:
            provider = str(identity.get("provider", "")).lower()
            if provider == "github":
                return identity
        return None

    def github_status(self, user_sub: str) -> dict:
        identity = self.github_identity(user_sub)
        if not identity:
            return {"linked": False, "provider": "github", "provider_user_id": None, "has_access_token": False}

        return {
            "linked": True,
            "provider": "github",
            "provider_user_id": identity.get("user_id"),
            "has_access_token": bool(identity.get("access_token")),
        }

    def github_access_token(self, user_sub: str) -> str | None:
        identity = self.github_identity(user_sub)
        if not identity:
            return None
        token = identity.get("access_token")
        return str(token) if token else None
