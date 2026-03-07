import uuid
import os
import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ["BACKBOARD_API_KEY"] = "test-backboard-key"

import app.routers.execution as execution_router
import app.services.backboard_project_state_service as project_state_service
from app.db.session import get_db
from app.main import app
from app.models.base import Base
from app.models.execution import Contact
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


def test_execution_plan_run_replaces_previous_plan_and_tasks(monkeypatch):
    client, _ = build_test_client()

    project_response = client.post(
        "/v1/projects",
        json={
            "name": "Launch Tool",
            "summary": "AI launch helper",
            "goal": "Get first users",
        },
    )
    project_id = project_response.json()["data"]["project_id"]

    monkeypatch.setattr(
        execution_router,
        "run_execution_plan_agent",
        lambda *args, **kwargs: (
            {
                "launch_strategy": {
                    "primary_channel": "cold_email",
                    "secondary_channels": ["linkedin"],
                },
                "tasks": [
                    {"day_number": 1, "title": "Task A", "description": "First", "priority": 1},
                    {"day_number": 2, "title": "Task B", "description": "Second", "priority": 2},
                ],
                "kpis": ["10 replies"],
                "chat_message": "Plan ready",
            },
            {"trace_id": "test"},
        ),
    )
    monkeypatch.setattr(project_state_service.BackboardProjectStateService, "sync_after_action", lambda *args, **kwargs: {"ok": True})

    first = client.post(f"/v1/projects/{project_id}/execution/plan", json={"mode": "baseline"})
    second = client.post(f"/v1/projects/{project_id}/execution/plan", json={"mode": "retry"})

    assert first.status_code == 200
    assert second.status_code == 200

    state = client.get(f"/v1/projects/{project_id}/execution/state")
    assert state.status_code == 200
    payload = state.json()["data"]
    assert len(payload["plans"]) == 1
    assert len(payload["tasks"]) == 2
    assert payload["tasks"][0]["title"] == "Task A"
    assert payload["tasks"][1]["title"] == "Task B"


def test_upsert_contacts_updates_existing_contact_instead_of_duplicating(monkeypatch):
    client, SessionLocal = build_test_client()

    project_response = client.post(
        "/v1/projects",
        json={
            "name": "Contact Tool",
            "summary": "AI launch helper",
            "goal": "Get first users",
        },
    )
    project_id = project_response.json()["data"]["project_id"]

    monkeypatch.setattr(project_state_service.BackboardProjectStateService, "sync_after_action", lambda *args, **kwargs: {"ok": True})

    first = client.post(
        f"/v1/projects/{project_id}/execution/contacts",
        json={"contacts": [{"name": "Alice", "email": "alice@example.com", "segment": "founder"}]},
    )
    second = client.post(
        f"/v1/projects/{project_id}/execution/contacts",
        json={"contacts": [{"name": "Alice Updated", "email": "Alice@example.com", "company": "Acme"}]},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["data"]["contact_ids"][0] == second.json()["data"]["contact_ids"][0]

    with SessionLocal() as db:
        contacts = db.query(Contact).all()
        assert len(contacts) == 1
        assert contacts[0].name == "Alice Updated"
        assert contacts[0].company == "Acme"
        assert contacts[0].email == "alice@example.com"
