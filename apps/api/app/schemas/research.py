import uuid
from typing import Literal

from pydantic import BaseModel


class ResearchRunRequest(BaseModel):
    pinned_wedge_ids: list[uuid.UUID] | None = None
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"


class ResearchSnapshot(BaseModel):
    summary: str | None = None
    competitors: list[dict] = []
    pain_point_clusters: list[dict] = []
    opportunity_wedges: list[dict] = []
