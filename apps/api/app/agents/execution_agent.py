from __future__ import annotations

from app.prompts.execution_prompt import EXECUTION_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def run_execution_plan_agent(
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
        stage="execution",
        system_prompt=EXECUTION_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            "Focus only on execution planning. Return launch_strategy, tasks, and kpis for a 7-day launch sprint."
        ),
    )
    normalized = {
        "launch_strategy": response.get("launch_strategy")
        or {
            "primary_channel": "",
            "secondary_channels": [],
            "why": "",
        },
        "tasks": response.get("tasks") or [],
        "kpis": response.get("kpis") or [],
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }


def run_asset_generation_agent(
    context: dict,
    asset_types: list[str],
    count: int,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[list[dict], dict]:
    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="execution",
        system_prompt=EXECUTION_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            f"Generate only assets. asset_types={asset_types}, count_per_type={count}. "
            "Return JSON with an assets array."
        ),
    )
    assets = response.get("assets") or []
    return assets, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }


def run_email_personalization_agent(
    context: dict,
    subject_line: str | None = None,
    max_contacts: int = 10,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[list[dict], dict]:
    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="execution",
        system_prompt=EXECUTION_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            f"Prepare personalized outreach drafts for up to {max_contacts} contacts. "
            f"Preferred subject line: {subject_line or 'none'}. "
            "Return JSON with a drafts array of {contact_id, subject, body}."
        ),
    )
    drafts = response.get("drafts")
    if drafts is None:
        drafts = response.get("messages")
    if drafts is None:
        drafts = response.get("emails")
    return drafts or [], {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }
