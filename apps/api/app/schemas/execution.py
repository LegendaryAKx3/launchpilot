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


class ImageAdDraftRequest(BaseModel):
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"


class ImageAdRenderRequest(BaseModel):
    prompt: str | None = None


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


class TaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    day_number: int | None = None
    priority: int | None = None
    status: str | None = None


class AssetUpdateRequest(BaseModel):
    title: str | None = None
    content: dict | None = None
    status: str | None = None


class ContactUpdateRequest(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    segment: str | None = None
    company: str | None = None
    personalization_notes: str | None = None


class DistributionAssetsRequest(BaseModel):
    channels: list[str] | None = None  # cold_dm, cold_email, image_ad_prompt, video_script
    variations_per_channel: int = 3
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"
