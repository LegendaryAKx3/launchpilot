from __future__ import annotations

import base64

import httpx


class GitHubClient:
    @staticmethod
    def _headers(access_token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def list_user_repos(self, access_token: str, per_page: int = 50) -> list[dict]:
        headers = self._headers(access_token)
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                "https://api.github.com/user/repos",
                headers=headers,
                params={"per_page": per_page, "sort": "updated"},
            )
            response.raise_for_status()
            repos = response.json()

        if not isinstance(repos, list):
            return []
        return [
            {
                "id": repo.get("id"),
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "private": repo.get("private"),
                "default_branch": repo.get("default_branch"),
                "html_url": repo.get("html_url"),
                "updated_at": repo.get("updated_at"),
            }
            for repo in repos
            if isinstance(repo, dict)
        ]

    def get_repo(self, access_token: str, owner: str, repo: str) -> dict:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                f"https://api.github.com/repos/{owner}/{repo}",
                headers=self._headers(access_token),
            )
            response.raise_for_status()
            payload = response.json()
            return {
                "id": payload.get("id"),
                "name": payload.get("name"),
                "full_name": payload.get("full_name"),
                "default_branch": payload.get("default_branch"),
                "private": payload.get("private"),
                "html_url": payload.get("html_url"),
            }

    def get_branch(self, access_token: str, owner: str, repo: str, branch: str) -> dict:
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/branches/{branch}",
                headers=self._headers(access_token),
            )
            response.raise_for_status()
            payload = response.json()
            commit = payload.get("commit") or {}
            return {
                "name": payload.get("name"),
                "sha": commit.get("sha"),
            }

    def list_path_contents(
        self,
        access_token: str,
        owner: str,
        repo: str,
        *,
        path: str = "",
        ref: str | None = None,
    ) -> list[dict]:
        normalized_path = path.strip().lstrip("/")
        url = f"https://api.github.com/repos/{owner}/{repo}/contents"
        if normalized_path:
            url = f"{url}/{normalized_path}"
        params = {"ref": ref} if ref else None
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                url,
                headers=self._headers(access_token),
                params=params,
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, list):
                return [item for item in payload if isinstance(item, dict)]
            if isinstance(payload, dict):
                return [payload]
            return []

    def get_file_text(
        self,
        access_token: str,
        owner: str,
        repo: str,
        *,
        path: str,
        ref: str | None = None,
        max_chars: int = 5000,
    ) -> str | None:
        normalized_path = path.strip().lstrip("/")
        if not normalized_path:
            return None
        params = {"ref": ref} if ref else None
        with httpx.Client(timeout=20.0) as client:
            response = client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{normalized_path}",
                headers=self._headers(access_token),
                params=params,
            )
            response.raise_for_status()
            payload = response.json()
        if not isinstance(payload, dict):
            return None
        if payload.get("type") != "file":
            return None
        if payload.get("encoding") != "base64":
            return None
        content = payload.get("content")
        if not isinstance(content, str):
            return None
        try:
            raw = base64.b64decode(content, validate=False)
            text = raw.decode("utf-8", errors="replace")
            return text[:max_chars]
        except Exception:  # noqa: BLE001
            return None
