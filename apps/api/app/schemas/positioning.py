import uuid
from typing import Literal

from pydantic import BaseModel


class PositioningRunRequest(BaseModel):
    wedge_ids: list[uuid.UUID] | None = None
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"


class PositioningSelectResponse(BaseModel):
    selected_version_id: uuid.UUID
