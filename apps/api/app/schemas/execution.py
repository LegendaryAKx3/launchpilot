import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr


class ExecutionPlanRequest(BaseModel):
    positioning_version_id: uuid.UUID | None = None
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"


class AssetGenerationRequest(BaseModel):
    types: list[str]
    count: int = 1
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"


class ContactInput(BaseModel):
    name: str | None = None
    email: EmailStr
    company: str | None = None
    segment: str | None = None
    personalization_notes: str | None = None


class ContactsUpsertRequest(BaseModel):
    contacts: list[ContactInput]


class EmailBatchPrepareRequest(BaseModel):
    subject_line: str | None = None
    max_contacts: int = 10
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"


class EmailBatchSendResponse(BaseModel):
    batch_id: uuid.UUID
    status: str
