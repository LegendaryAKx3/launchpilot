import uuid

from pydantic import BaseModel

from app.schemas.common import APIModel


class ProjectCreateRequest(BaseModel):
    name: str
    summary: str | None = None
    goal: str | None = None
    website_url: str | None = None
    repo_url: str | None = None
    target_market_hint: str | None = None


class ProjectBriefUpsertRequest(BaseModel):
    raw_brief: str
    parsed_problem: str | None = None
    parsed_audience: str | None = None
    parsed_constraints: dict = {}


class ProjectSourceCreateRequest(BaseModel):
    source_type: str
    url: str | None = None
    storage_path: str | None = None
    title: str | None = None


class ProjectSummary(APIModel):
    id: uuid.UUID
    workspace_id: uuid.UUID
    name: str
    slug: str
    summary: str | None = None
    stage: str
    goal: str | None = None
    website_url: str | None = None
    repo_url: str | None = None
    status: str
