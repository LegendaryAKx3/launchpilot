from __future__ import annotations

from app.prompts.research_prompt import RESEARCH_PROMPT
from app.services.backboard_stage_service import BackboardStageService
from app.services.contact_sanitizer import name_looks_like_role


def run_research_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
    extra_task_instructions: str | None = None,
) -> tuple[dict, dict]:
    def _normalize_outreach_contacts(raw: list | None) -> list[dict]:
        if not isinstance(raw, list):
            return []
        contacts: list[dict] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            email = str(item.get("email") or "").strip().lower()
            if not email:
                continue
            raw_name = str(item.get("name") or "").strip() or None
            # Strip names that look like role titles (e.g. "Head of Growth")
            if raw_name and name_looks_like_role(raw_name):
                raw_name = None
            contacts.append(
                {
                    "name": raw_name,
                    "email": email,
                    "company": str(item.get("company") or "").strip() or None,
                    "role": str(item.get("role") or "").strip() or None,
                    "priority": item.get("priority") if isinstance(item.get("priority"), int) else 999,
                    "reason": str(item.get("reason") or "").strip() or None,
                }
            )
        contacts.sort(key=lambda c: c.get("priority", 999))
        return contacts[:15]

    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="research",
        system_prompt=RESEARCH_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=extra_task_instructions,
    )
    normalized = {
        "project_category": response.get("project_category") or "unknown",
        "candidate_user_segments": response.get("candidate_user_segments") or [],
        "competitors": response.get("competitors") or [],
        "pain_point_clusters": response.get("pain_point_clusters") or [],
        "opportunity_wedges": response.get("opportunity_wedges") or [],
        "risk_warnings": response.get("risk_warnings") or [],
        "outreach_contacts": _normalize_outreach_contacts(response.get("outreach_contacts")),
        "summary": response.get("summary") or "",
        "chat_message": response.get("chat_message") or "",
        "next_step_suggestion": response.get("next_step_suggestion") or "",
        "should_move_to_next_stage": bool(response.get("should_move_to_next_stage")),
        "next_stage": response.get("next_stage") or "research",
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }
