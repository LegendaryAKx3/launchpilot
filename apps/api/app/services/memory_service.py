from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
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
    stmt = (
        insert(ProjectMemory)
        .values(
            project_id=project_id,
            memory_key=key,
            memory_value=value,
            memory_type=memory_type,
            source=source,
        )
        .on_conflict_do_update(
            index_elements=[ProjectMemory.project_id, ProjectMemory.memory_key],
            set_={
                "memory_value": value,
                "memory_type": memory_type,
                "source": source,
                "updated_at": func.now(),
            },
        )
        .returning(ProjectMemory.id)
    )
    row_id = db.execute(stmt).scalar_one()
    row = db.get(ProjectMemory, row_id)
    if row is None:
        raise RuntimeError("Failed to upsert project memory row")
    return row


def get_project_memory_value(
    db: Session,
    project_id,
    key: str,
    default: dict | None = None,
) -> dict:
    row = (
        db.query(ProjectMemory).filter(ProjectMemory.project_id == project_id, ProjectMemory.memory_key == key).first()
    )
    if not row:
        return default or {}
    return row.memory_value or (default or {})
