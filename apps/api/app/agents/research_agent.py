from __future__ import annotations

from app.prompts.research_prompt import RESEARCH_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def run_research_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
    extra_task_instructions: str | None = None,
) -> tuple[dict, dict]:
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
