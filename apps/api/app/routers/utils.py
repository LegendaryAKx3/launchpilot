import logging

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def success(data, meta: dict | None = None) -> dict:
    return {"data": data, "meta": meta or {}}


def error(code: str, message: str, http_status: int = status.HTTP_400_BAD_REQUEST):
    raise HTTPException(status_code=http_status, detail={"code": code, "message": message})


def safe_commit(db: Session) -> None:
    """Commit with error handling and rollback on failure."""
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Database commit failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "DB_ERROR", "message": "Failed to save changes. Please try again."},
        )
