from __future__ import annotations

from app.integrations.backboard_client import BackboardRequestError
from app.prompts.positioning_prompt import POSITIONING_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def _fallback_positioning_output(context: dict) -> dict:
    wedges = context.get("research", {}).get("wedges", [])
    chosen_wedge = wedges[0]["label"] if wedges else "Narrow audience launch execution"

    return {
        "prompt_used": POSITIONING_PROMPT,
        "recommended_icp": "CS students and indie developers launching portfolio tools",
        "recommended_wedge": chosen_wedge,
        "positioning_statement": "For technical builders with weak GTM skills, Growth Launchpad turns raw projects into approval-gated first-user launch systems.",
        "headline": "Turn your side project into first users",
        "subheadline": "Research your niche, choose a wedge, and execute supervised outreach in one workspace.",
        "benefits": [
            "Narrow ICP and wedge selection",
            "Generated launch assets and 7-day plan",
            "Approval-gated outbound execution",
        ],
        "objection_handling": [
            {
                "objection": "Why not use general chat tools",
                "response": "This workflow stores decisions and executes launch actions with approvals and memory.",
            }
        ],
        "pricing_direction": "Free tier with optional paid launch sprint",
    }


def run_positioning_agent(
    context: dict,
    *,
    backboard: BackboardStageService | None = None,
    project_id: str | None = None,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    if backboard and project_id:
        try:
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
        except BackboardRequestError as exc:
            fallback = _fallback_positioning_output(context)
            return fallback, {
                "provider": "fallback",
                "mode": mode,
                "used_advice": bool(advice and advice.strip()),
                "fallback_reason": str(exc),
            }

    fallback = _fallback_positioning_output(context)
    return fallback, {
        "provider": "fallback",
        "mode": mode,
        "used_advice": bool(advice and advice.strip()),
        "fallback_reason": "Backboard not configured",
    }
