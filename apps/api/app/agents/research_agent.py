from __future__ import annotations

from app.integrations.backboard_client import BackboardRequestError
from app.prompts.research_prompt import RESEARCH_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def _fallback_research_output(context: dict) -> dict:
    project_name = context.get("project", {}).get("name") or "Project"
    summary = (context.get("project", {}).get("summary") or "").lower()

    category = "developer productivity" if "developer" in summary or "dev" in summary else "early-stage SaaS"
    segments = ["student developers", "indie developers"]

    competitors = [
        {
            "name": "Notion",
            "positioning": "All-in-one workspace",
            "pricing_summary": "Freemium + team plans",
            "strengths": ["brand", "templates"],
            "weaknesses": ["generic onboarding"],
        },
        {
            "name": "Linear",
            "positioning": "Fast issue tracking",
            "pricing_summary": "Per-seat SaaS",
            "strengths": ["speed", "developer affinity"],
            "weaknesses": ["narrow use case"],
        },
    ]

    pains = [
        {
            "label": "No clear first audience",
            "description": "Builders cannot decide a narrow ICP for launch",
            "evidence": ["brief ambiguity", "broad messaging"],
        },
        {
            "label": "Inconsistent launch execution",
            "description": "Advice exists but execution steps are unclear",
            "evidence": ["missing tactical sequence"],
        },
    ]

    wedges = [
        {
            "label": "Hackathon to first users",
            "description": "Convert student and indie hackathon projects into first-user systems",
            "score": 0.84,
        },
        {
            "label": "Operator-in-the-loop outbound",
            "description": "Approval-gated outreach for technical builders",
            "score": 0.77,
        },
    ]

    return {
        "prompt_used": RESEARCH_PROMPT,
        "project_category": category,
        "candidate_user_segments": segments,
        "competitors": competitors,
        "pain_point_clusters": pains,
        "opportunity_wedges": wedges,
        "risk_warnings": ["Crowded launch tooling category"],
        "summary": f"{project_name} sits in {category} with strongest wedge around hackathon-to-first-user execution.",
    }


def run_research_agent(
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
                stage="research",
                system_prompt=RESEARCH_PROMPT,
                context=context,
                advice=advice,
                mode=mode,
            )
            normalized = {
                "project_category": response.get("project_category") or "unknown",
                "candidate_user_segments": response.get("candidate_user_segments") or [],
                "competitors": response.get("competitors") or [],
                "pain_point_clusters": response.get("pain_point_clusters") or [],
                "opportunity_wedges": response.get("opportunity_wedges") or [],
                "risk_warnings": response.get("risk_warnings") or [],
                "summary": response.get("summary") or "",
            }
            return normalized, {
                "provider": trace.provider,
                "mode": trace.mode,
                "used_advice": trace.used_advice,
                "assistant_id": trace.assistant_id,
                "thread_id": trace.thread_id,
            }
        except BackboardRequestError as exc:
            fallback = _fallback_research_output(context)
            return fallback, {
                "provider": "fallback",
                "mode": mode,
                "used_advice": bool(advice and advice.strip()),
                "fallback_reason": str(exc),
            }

    fallback = _fallback_research_output(context)
    return fallback, {
        "provider": "fallback",
        "mode": mode,
        "used_advice": bool(advice and advice.strip()),
        "fallback_reason": "Backboard not configured",
    }
