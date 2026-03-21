import uuid
from typing import Literal

from pydantic import BaseModel, EmailStr, field_validator


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

    @field_validator("contacts")
    @classmethod
    def validate_contacts_size(cls, v: list[ContactInput]) -> list[ContactInput]:
        if len(v) > 1000:
            raise ValueError("Cannot upsert more than 1000 contacts at once")
        return v


class EmailBatchPrepareRequest(BaseModel):
    subject_line: str | None = None
    max_contacts: int = 10
    advice: str | None = None
    mode: Literal["baseline", "deepen", "retry", "extend"] = "baseline"

    @field_validator("subject_line")
    @classmethod
    def validate_subject_line(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 500:
            raise ValueError("Subject line must be 500 characters or fewer")
        return v

    @field_validator("max_contacts")
    @classmethod
    def validate_max_contacts(cls, v: int) -> int:
        if v < 1 or v > 500:
            raise ValueError("max_contacts must be between 1 and 500")
        return v


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


class DriveWriteRequest(BaseModel):
    title: str
    content: str
    mime_type: str = "text/plain"
    folder_id: str | None = None

    @field_validator("content")
    @classmethod
    def validate_content_size(cls, v: str) -> str:
        if len(v) > 500_000:
            raise ValueError("Content must be 500,000 characters or fewer")
        return v
