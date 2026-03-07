import uuid
from typing import Literal

from pydantic import BaseModel, Field


class GitHubRepoContextRequest(BaseModel):
    owner: str
    repo: str
    branch: str | None = None
    path: str | None = None
    max_files: int = Field(default=6, ge=1, le=20)
    max_file_chars: int = Field(default=5000, ge=500, le=15000)


class ResearchRunRequest(BaseModel):
    pinned_wedge_ids: list[uuid.UUID] | None = None
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"
    github_repo: GitHubRepoContextRequest | None = None


class ResearchSnapshot(BaseModel):
    summary: str | None = None
    competitors: list[dict] = []
    pain_point_clusters: list[dict] = []
    opportunity_wedges: list[dict] = []
