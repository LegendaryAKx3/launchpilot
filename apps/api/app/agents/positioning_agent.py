from __future__ import annotations

from app.prompts.positioning_prompt import POSITIONING_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def run_positioning_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="positioning",
        system_prompt=POSITIONING_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
    )
    normalized = {
        "recommended_icp": response.get("recommended_icp") or "",
        "recommended_wedge": response.get("recommended_wedge") or "",
        "positioning_statement": response.get("positioning_statement") or "",
        "headline": response.get("headline") or "",
        "subheadline": response.get("subheadline") or "",
        "benefits": response.get("benefits") or [],
        "objection_handling": response.get("objection_handling") or [],
        "pricing_direction": response.get("pricing_direction") or "",
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }
