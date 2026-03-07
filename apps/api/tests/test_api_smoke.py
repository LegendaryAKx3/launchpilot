import uuid
import os
import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import get_db
from app.main import app
from app.models.base import Base
from app.models.project import Project


def build_test_client():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    return TestClient(app), TestingSessionLocal


def test_health_endpoint():
    client, _ = build_test_client()
    response = client.get("/v1/health")
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "ok"


def test_project_creation_returns_slug_and_creates_project():
    client, SessionLocal = build_test_client()

    response = client.post(
        "/v1/projects",
        json={
            "name": "My Tool",
            "summary": "AI launch helper",
            "goal": "Get first users",
        },
    )
    assert response.status_code == 200

    payload = response.json()["data"]
    assert uuid.UUID(payload["project_id"])
    assert payload["slug"] == "my-tool"

    with SessionLocal() as db:
        row = db.query(Project).filter(Project.id == uuid.UUID(payload["project_id"])).first()
        assert row is not None
        assert row.name == "My Tool"
