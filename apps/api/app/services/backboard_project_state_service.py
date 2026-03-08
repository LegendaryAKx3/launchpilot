from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.integrations.backboard_client import BackboardClient, BackboardRequestError
from app.models.approval import ActivityEvent, Approval
from app.models.chat import AgentChatMessage
from app.models.execution import Asset, Contact, LaunchPlan, LaunchTask, OutboundBatch, OutboundMessage
from app.models.positioning import PositioningVersion
from app.models.project import Project, ProjectBrief, ProjectMemory, ProjectSource
from app.models.research import Competitor, OpportunityWedge, PainPointCluster, ResearchRun
from app.services.memory_service import get_project_memory_value, upsert_project_memory

PROJECT_STATE_PROMPT = """
You are the internal Project State Tracker for Growth Launchpad.
Your role is to retain durable, structured project state for one project only.
Do not act like a user-facing assistant.
Store factual project updates, pipeline progress, decisions, artifacts, approvals, and chat context.
Use the memory attached to this assistant as the canonical running state history for this project.
""".strip()

LOGGER = logging.getLogger(__name__)


class BackboardProjectStateService:
    def __init__(self, db: Session, settings: Settings | None = None):
        self.db = db
        self.settings = settings or get_settings()
        self._client: BackboardClient | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.settings.backboard_api_key)

    @property
    def client(self) -> BackboardClient:
        if self._client is None:
            if not self.settings.backboard_api_key:
                raise BackboardRequestError("BACKBOARD_API_KEY is not configured")
            self._client = BackboardClient(
                api_key=self.settings.backboard_api_key,
                base_url=self.settings.backboard_base_url,
            )
        return self._client

    def sync_after_action(
        self,
        *,
        project_id: str,
        reason: str,
        stage: str,
        extra: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if not self.enabled:
            return {"status": "skipped", "reason": "backboard_disabled"}

        try:
            assistant_ids = self._ensure_project_scoped_assistants(project_id)
            snapshot = self._build_project_state_snapshot(project_id)
            content = self._build_memory_content(
                project_id=project_id,
                reason=reason,
                stage=stage,
                snapshot=snapshot,
                extra=extra or {},
            )
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            last_hash = get_project_memory_value(self.db, project_id, "backboard_project_state_last_hash", {})
            if isinstance(last_hash, dict) and last_hash.get("hash") == content_hash:
                result = {
                    "status": "skipped",
                    "reason": reason,
                    "stage": stage,
                    "skip_reason": "unchanged_payload",
                    "synced_at": datetime.utcnow().isoformat() + "Z",
                }
                upsert_project_memory(
                    self.db,
                    project_id,
                    "backboard_project_state_last_sync",
                    result,
                    "integration_ref",
                    "backboard",
                )
                self.db.commit()
                return result

            synced: list[dict[str, Any]] = []
            errors: list[dict[str, Any]] = []
            for assistant_ref in assistant_ids:
                try:
                    raw = self.client.add_memory(assistant_ref["assistant_id"], content)
                    synced.append(
                        {
                            "scope": assistant_ref["scope"],
                            "assistant_id": assistant_ref["assistant_id"],
                            "memory_id": self._extract_value(raw, ("memory_id", "id")),
                            "memory_operation_id": self._extract_value(raw, ("memory_operation_id", "operation_id")),
                        }
                    )
                except BackboardRequestError as exc:
                    recovered = False
                    if assistant_ref["scope"] == "project_state" and self._is_recoverable_memory_error(exc):
                        LOGGER.warning(
                            "backboard.project_state_memory_failed rotating assistant project_id=%s assistant_id=%s error=%s",
                            project_id,
                            assistant_ref["assistant_id"],
                            exc,
                        )
                        replacement_id = self._rotate_project_state_assistant(project_id)
                        try:
                            raw = self.client.add_memory(replacement_id, content)
                            LOGGER.info(
                                "backboard.project_state_memory_recovered project_id=%s previous_assistant_id=%s replacement_assistant_id=%s",
                                project_id,
                                assistant_ref["assistant_id"],
                                replacement_id,
                            )
                            synced.append(
                                {
                                    "scope": assistant_ref["scope"],
                                    "assistant_id": replacement_id,
                                    "memory_id": self._extract_value(raw, ("memory_id", "id")),
                                    "memory_operation_id": self._extract_value(raw, ("memory_operation_id", "operation_id")),
                                    "rotated_from": assistant_ref["assistant_id"],
                                }
                            )
                            recovered = True
                        except BackboardRequestError as retry_exc:
                            LOGGER.warning(
                                "backboard.project_state_memory_retry_failed project_id=%s replacement_assistant_id=%s error=%s",
                                project_id,
                                replacement_id,
                                retry_exc,
                            )
                            errors.append(
                                {
                                    "scope": assistant_ref["scope"],
                                    "assistant_id": replacement_id,
                                    "error": str(retry_exc),
                                    "rotated_from": assistant_ref["assistant_id"],
                                }
                            )
                    if recovered:
                        continue
                    errors.append(
                        {
                            "scope": assistant_ref["scope"],
                            "assistant_id": assistant_ref["assistant_id"],
                            "error": str(exc),
                        }
                    )

            result = {
                "status": "ok" if synced else "error",
                "reason": reason,
                "stage": stage,
                "synced_assistants": synced,
                "errors": errors,
                "synced_at": datetime.utcnow().isoformat() + "Z",
            }
            if synced:
                upsert_project_memory(
                    self.db,
                    project_id,
                    "backboard_project_state_last_hash",
                    {"hash": content_hash, "synced_at": result["synced_at"]},
                    "integration_ref",
                    "backboard",
                )
        except BackboardRequestError as exc:
            result = {
                "status": "error",
                "reason": reason,
                "stage": stage,
                "error": str(exc),
                "synced_at": datetime.utcnow().isoformat() + "Z",
            }

        upsert_project_memory(
            self.db,
            project_id,
            "backboard_project_state_last_sync",
            result,
            "integration_ref",
            "backboard",
        )
        self.db.commit()
        return result

    def _ensure_project_scoped_assistants(self, project_id: str) -> list[dict[str, str]]:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        project_name = project.name if project else "project"

        refs: list[dict[str, str]] = []

        state_assistant_mem = get_project_memory_value(self.db, project_id, "backboard_project_state_assistant", {})
        state_assistant_id = state_assistant_mem.get("assistant_id")
        if not state_assistant_id:
            state_assistant_id = self.client.create_assistant(
                name=f"{project_name}-project-state",
                system_prompt=PROJECT_STATE_PROMPT,
            )
            upsert_project_memory(
                self.db,
                project_id,
                "backboard_project_state_assistant",
                {"assistant_id": state_assistant_id},
                "integration_ref",
                "backboard",
            )

        refs.append({"scope": "project_state", "assistant_id": state_assistant_id})

        return refs

    def _build_memory_content(
        self,
        *,
        project_id: str,
        reason: str,
        stage: str,
        snapshot: dict[str, Any],
        extra: dict[str, Any],
    ) -> str:
        payload = {
            "type": "project_state_sync",
            "project_id": project_id,
            "reason": reason,
            "stage": stage,
            "synced_at": datetime.utcnow().isoformat() + "Z",
            "extra": extra,
            "snapshot": self._compact_snapshot_for_memory(snapshot),
        }
        serialized = json.dumps(payload, ensure_ascii=True)
        if len(serialized) > 12000:
            payload["snapshot"]["recent_activity"] = payload["snapshot"]["recent_activity"][:8]
            payload["snapshot"]["chat"] = {
                key: value[:2] for key, value in (payload["snapshot"].get("chat") or {}).items()
            }
            serialized = json.dumps(payload, ensure_ascii=True)
        if len(serialized) > 8000:
            payload["snapshot"] = {
                "project": payload["snapshot"].get("project"),
                "counts": payload["snapshot"].get("counts"),
                "recent_activity": payload["snapshot"].get("recent_activity", [])[:4],
            }
            serialized = json.dumps(payload, ensure_ascii=True)
        return serialized

    def _compact_snapshot_for_memory(self, snapshot: dict[str, Any]) -> dict[str, Any]:
        project = snapshot.get("project") or {}
        brief = snapshot.get("brief") or {}
        research = snapshot.get("research") or {}
        positioning = snapshot.get("positioning") or {}
        execution = snapshot.get("execution") or {}
        approvals = snapshot.get("approvals") or []
        recent_activity = snapshot.get("recent_activity") or []
        chat = snapshot.get("chat") or {}

        def _trim(text: Any, limit: int = 280) -> str | None:
            if text is None:
                return None
            value = str(text).strip()
            if not value:
                return None
            return value[:limit]

        compact_chat: dict[str, list[dict[str, Any]]] = {}
        for agent, messages in chat.items():
            if not isinstance(messages, list):
                continue
            compact_chat[str(agent)] = [
                {
                    "role": item.get("role"),
                    "content": _trim(item.get("content"), 220),
                    "created_at": item.get("created_at"),
                }
                for item in messages[-3:]
                if isinstance(item, dict)
            ]

        return {
            "project": {
                "id": project.get("id"),
                "name": _trim(project.get("name"), 120),
                "goal": _trim(project.get("goal"), 220),
                "stage": project.get("stage"),
                "status": project.get("status"),
            },
            "brief": {
                "problem": _trim(brief.get("problem"), 220),
                "audience": _trim(brief.get("audience"), 220),
                "constraints": _trim(brief.get("constraints"), 220),
            },
            "counts": {
                "sources": len(snapshot.get("sources") or []),
                "project_memory": len(snapshot.get("project_memory") or []),
                "competitors": len(research.get("competitors") or []),
                "pain_point_clusters": len(research.get("pain_point_clusters") or []),
                "opportunity_wedges": len(research.get("opportunity_wedges") or []),
                "positioning_versions": len(positioning.get("versions") or []),
                "plans": len(execution.get("plans") or []),
                "tasks": len(execution.get("tasks") or []),
                "assets": len(execution.get("assets") or []),
                "contacts": len(execution.get("contacts") or []),
                "batches": len(execution.get("batches") or []),
                "outbound_messages": len(execution.get("outbound_messages") or []),
                "approvals": len(approvals),
            },
            "research_highlights": [
                _trim(item.get("label"), 140)
                for item in (research.get("opportunity_wedges") or [])[:5]
                if isinstance(item, dict) and item.get("label")
            ],
            "recent_activity": [
                {
                    "verb": item.get("verb"),
                    "object_type": item.get("object_type"),
                    "object_id": item.get("object_id"),
                    "created_at": item.get("created_at"),
                }
                for item in recent_activity[:12]
                if isinstance(item, dict)
            ],
            "chat": compact_chat,
        }

    def _build_project_state_snapshot(self, project_id: str) -> dict[str, Any]:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        brief = (
            self.db.query(ProjectBrief)
            .filter(ProjectBrief.project_id == project_id)
            .order_by(ProjectBrief.created_at.desc())
            .first()
        )
        sources = self.db.query(ProjectSource).filter(ProjectSource.project_id == project_id).all()
        memories = self.db.query(ProjectMemory).filter(ProjectMemory.project_id == project_id).all()
        research_run = (
            self.db.query(ResearchRun)
            .filter(ResearchRun.project_id == project_id)
            .order_by(ResearchRun.created_at.desc())
            .first()
        )
        competitors = self.db.query(Competitor).filter(Competitor.project_id == project_id).all()
        pains = self.db.query(PainPointCluster).filter(PainPointCluster.project_id == project_id).all()
        wedges = self.db.query(OpportunityWedge).filter(OpportunityWedge.project_id == project_id).all()
        positioning_versions = (
            self.db.query(PositioningVersion)
            .filter(PositioningVersion.project_id == project_id)
            .order_by(PositioningVersion.created_at.desc())
            .all()
        )
        plans = self.db.query(LaunchPlan).filter(LaunchPlan.project_id == project_id).order_by(LaunchPlan.created_at.desc()).all()
        plan_ids = [plan.id for plan in plans]
        tasks = (
            self.db.query(LaunchTask)
            .filter(LaunchTask.launch_plan_id.in_(plan_ids))
            .order_by(LaunchTask.day_number.asc(), LaunchTask.created_at.asc())
            .all()
            if plan_ids
            else []
        )
        assets = self.db.query(Asset).filter(Asset.project_id == project_id).order_by(Asset.created_at.desc()).all()
        contacts = self.db.query(Contact).filter(Contact.project_id == project_id).order_by(Contact.created_at.desc()).all()
        batches = (
            self.db.query(OutboundBatch)
            .filter(OutboundBatch.project_id == project_id)
            .order_by(OutboundBatch.created_at.desc())
            .all()
        )
        batch_ids = [batch.id for batch in batches]
        outbound_messages = (
            self.db.query(OutboundMessage)
            .filter(OutboundMessage.batch_id.in_(batch_ids))
            .order_by(OutboundMessage.created_at.desc())
            .all()
            if batch_ids
            else []
        )
        approvals = (
            self.db.query(Approval)
            .filter(Approval.project_id == project_id)
            .order_by(Approval.created_at.desc())
            .all()
        )
        activity = (
            self.db.query(ActivityEvent)
            .filter(ActivityEvent.project_id == project_id)
            .order_by(ActivityEvent.created_at.desc())
            .limit(30)
            .all()
        )
        chat_rows = (
            self.db.query(AgentChatMessage)
            .filter(AgentChatMessage.project_id == project_id)
            .order_by(AgentChatMessage.created_at.desc())
            .limit(60)
            .all()
        )

        chat_by_agent: dict[str, list[dict[str, Any]]] = {"research": [], "positioning": [], "execution": []}
        for row in reversed(chat_rows):
            bucket = chat_by_agent.setdefault(row.agent_type, [])
            bucket.append(
                {
                    "role": row.role,
                    "content": row.content,
                    "metadata": row.message_metadata,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
            )

        return {
            "project": {
                "id": str(project.id) if project else project_id,
                "name": project.name if project else None,
                "summary": project.summary if project else None,
                "goal": project.goal if project else None,
                "stage": project.stage if project else None,
                "status": project.status if project else None,
                "website_url": project.website_url if project else None,
                "repo_url": project.repo_url if project else None,
            },
            "brief": {
                "raw": brief.raw_brief if brief else None,
                "problem": brief.parsed_problem if brief else None,
                "audience": brief.parsed_audience if brief else None,
                "constraints": brief.parsed_constraints if brief else None,
            },
            "sources": [
                {
                    "type": row.source_type,
                    "url": row.url,
                    "title": row.title,
                    "status": row.status,
                }
                for row in sources
            ],
            "project_memory": [self._serialize_project_memory(row) for row in memories],
            "research": {
                "latest_run": {
                    "id": str(research_run.id) if research_run else None,
                    "status": research_run.status if research_run else None,
                    "summary": research_run.summary if research_run else None,
                    "completed_at": research_run.completed_at.isoformat() if research_run and research_run.completed_at else None,
                },
                "competitors": [
                    {
                        "name": row.name,
                        "positioning": row.positioning,
                        "pricing_summary": row.pricing_summary,
                        "strengths": row.strengths,
                        "weaknesses": row.weaknesses,
                    }
                    for row in competitors
                ],
                "pain_point_clusters": [
                    {
                        "label": row.label,
                        "description": row.description,
                        "evidence": row.evidence,
                        "rank": row.rank,
                    }
                    for row in pains
                ],
                "opportunity_wedges": [
                    {
                        "label": row.label,
                        "description": row.description,
                        "score": float(row.score or 0),
                        "status": row.status,
                    }
                    for row in wedges
                ],
            },
            "positioning": {
                "versions": [
                    {
                        "id": str(row.id),
                        "selected": row.selected,
                        "icp": row.icp,
                        "wedge": row.wedge,
                        "headline": row.headline,
                        "subheadline": row.subheadline,
                        "statement": row.positioning_statement,
                        "benefits": row.benefits,
                        "pricing_direction": row.pricing_direction,
                    }
                    for row in positioning_versions
                ]
            },
            "execution": {
                "plans": [
                    {
                        "id": str(row.id),
                        "positioning_version_id": str(row.positioning_version_id) if row.positioning_version_id else None,
                        "primary_channel": row.primary_channel,
                        "secondary_channels": row.secondary_channels,
                        "kpis": row.kpis,
                        "status": row.status,
                    }
                    for row in plans
                ],
                "tasks": [
                    {
                        "id": str(row.id),
                        "launch_plan_id": str(row.launch_plan_id),
                        "day_number": row.day_number,
                        "title": row.title,
                        "description": row.description,
                        "status": row.status,
                        "priority": row.priority,
                    }
                    for row in tasks
                ],
                "assets": [
                    {
                        "id": str(row.id),
                        "type": row.asset_type,
                        "title": row.title,
                        "status": row.status,
                        "content": row.content,
                    }
                    for row in assets
                ],
                "contacts": [
                    {
                        "id": str(row.id),
                        "name": row.name,
                        "email": row.email,
                        "segment": row.segment,
                        "source": row.source,
                    }
                    for row in contacts
                ],
                "batches": [
                    {
                        "id": str(row.id),
                        "status": row.status,
                        "subject_line": row.subject_line,
                        "send_count": row.send_count,
                        "approved_at": row.approved_at.isoformat() if row.approved_at else None,
                        "sent_at": row.sent_at.isoformat() if row.sent_at else None,
                    }
                    for row in batches
                ],
                "outbound_messages": [
                    {
                        "id": str(row.id),
                        "batch_id": str(row.batch_id),
                        "contact_id": str(row.contact_id),
                        "status": row.status,
                        "subject": row.subject,
                        "error_message": row.error_message,
                    }
                    for row in outbound_messages
                ],
            },
            "approvals": [
                {
                    "id": str(row.id),
                    "action_type": row.action_type,
                    "resource_type": row.resource_type,
                    "resource_id": row.resource_id,
                    "status": row.status,
                    "reason": row.reason,
                    "required_scope": row.required_scope,
                    "approved_at": row.approved_at.isoformat() if row.approved_at else None,
                    "rejected_at": row.rejected_at.isoformat() if row.rejected_at else None,
                }
                for row in approvals
            ],
            "recent_activity": [
                {
                    "verb": row.verb,
                    "actor_type": row.actor_type,
                    "object_type": row.object_type,
                    "object_id": row.object_id,
                    "metadata": row.event_metadata,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row in activity
            ],
            "chat": chat_by_agent,
        }

    def _serialize_project_memory(self, row: ProjectMemory) -> dict[str, Any]:
        value = row.memory_value or {}
        if row.memory_key.startswith("backboard_") and isinstance(value, dict):
            compact = {
                key: value.get(key)
                for key in ("assistant_id", "thread_id", "mode", "memory_mode", "status", "reason", "stage", "synced_at")
                if key in value
            }
            if "backboard_memory_sync" in value and isinstance(value["backboard_memory_sync"], dict):
                compact["backboard_memory_sync"] = {
                    key: value["backboard_memory_sync"].get(key)
                    for key in ("status", "memory_mode", "memory_id", "memory_operation_id")
                    if key in value["backboard_memory_sync"]
                }
            value = compact

        return {
            "key": row.memory_key,
            "type": row.memory_type,
            "source": row.source,
            "value": value,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }

    def _extract_value(self, data: dict[str, Any], keys: tuple[str, ...]) -> str | None:
        for key in keys:
            value = data.get(key)
            if isinstance(value, str) and value:
                return value
        return None

    def _is_recoverable_memory_error(self, exc: BackboardRequestError) -> bool:
        text = str(exc).lower()
        return any(code in text for code in ("(429)", "(500)", "(502)", "(503)", "(504)"))

    def _rotate_project_state_assistant(self, project_id: str) -> str:
        project = self.db.query(Project).filter(Project.id == project_id).first()
        project_name = project.name if project and project.name else "project"
        previous = get_project_memory_value(self.db, project_id, "backboard_project_state_assistant", {}).get("assistant_id")
        assistant_id = self.client.create_assistant(
            name=f"{project_name}-project-state",
            system_prompt=PROJECT_STATE_PROMPT,
        )
        upsert_project_memory(
            self.db,
            project_id,
            "backboard_project_state_assistant",
            {
                "assistant_id": assistant_id,
                "rotated_from": previous,
                "rotated_at": datetime.utcnow().isoformat() + "Z",
            },
            "integration_ref",
            "backboard",
        )
        return assistant_id
