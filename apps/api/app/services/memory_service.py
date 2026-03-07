from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.project import ProjectMemory


def upsert_project_memory(
    db: Session,
    project_id,
    key: str,
    value: dict,
    memory_type: str,
    source: str,
) -> ProjectMemory:
    row = (
        db.query(ProjectMemory)
        .filter(ProjectMemory.project_id == project_id, ProjectMemory.memory_key == key)
        .first()
    )
    if row:
        row.memory_value = value
        row.memory_type = memory_type
        row.source = source
        return row

    row = ProjectMemory(
        project_id=project_id,
        memory_key=key,
        memory_value=value,
        memory_type=memory_type,
        source=source,
    )
    db.add(row)
    return row


def get_project_memory_value(
    db: Session,
    project_id,
    key: str,
    default: dict | None = None,
) -> dict:
    row = (
        db.query(ProjectMemory)
        .filter(ProjectMemory.project_id == project_id, ProjectMemory.memory_key == key)
        .first()
    )
    if not row:
        return default or {}
    return row.memory_value or (default or {})
