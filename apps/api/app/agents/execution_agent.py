from __future__ import annotations

from datetime import datetime

from app.integrations.backboard_client import BackboardRequestError
from app.prompts.execution_prompt import EXECUTION_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def _fallback_execution_plan_output() -> dict:
    return {
        "launch_strategy": {
            "primary_channel": "email outreach",
            "secondary_channels": ["reddit", "x"],
            "why": "Fastest path to early validation for niche builder tools",
        },
        "tasks": [
            {
                "day_number": day,
                "title": f"Day {day}: Launch task",
                "description": "Execute planned launch step and capture feedback",
                "priority": 3,
            }
            for day in range(1, 8)
        ],
        "kpis": ["emails_sent", "reply_rate", "signup_count"],
    }


def run_execution_plan_agent(
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
                    "primary_channel": "email outreach",
                    "secondary_channels": [],
                    "why": "No rationale provided",
                },
                "tasks": response.get("tasks") or [],
                "kpis": response.get("kpis") or ["emails_sent", "reply_rate", "signup_count"],
            }
            return normalized, {
                "provider": trace.provider,
                "mode": trace.mode,
                "used_advice": trace.used_advice,
                "assistant_id": trace.assistant_id,
                "thread_id": trace.thread_id,
            }
        except BackboardRequestError as exc:
            fallback = _fallback_execution_plan_output()
            return fallback, {
                "provider": "fallback",
                "mode": mode,
                "used_advice": bool(advice and advice.strip()),
                "fallback_reason": str(exc),
            }

    fallback = _fallback_execution_plan_output()
    return fallback, {
        "provider": "fallback",
        "mode": mode,
        "used_advice": bool(advice and advice.strip()),
        "fallback_reason": "Backboard not configured",
    }


def _fallback_asset_generation_output(context: dict, asset_types: list[str], count: int) -> list[dict]:
    project_name = context.get("project", {}).get("name") or "Project"
    assets = []
    for asset_type in asset_types:
        for idx in range(count):
            assets.append(
                {
                    "asset_type": asset_type,
                    "title": f"{project_name} {asset_type} v{idx + 1}",
                    "content": {
                        "generated_at": datetime.utcnow().isoformat(),
                        "body": f"Draft {asset_type} for {project_name}",
                        "cta": "Start your first launch sprint",
                    },
                }
            )
    return assets


def run_asset_generation_agent(
    context: dict,
    asset_types: list[str],
    count: int,
    *,
    backboard: BackboardStageService | None = None,
    project_id: str | None = None,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[list[dict], dict]:
    if backboard and project_id:
        try:
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
        except BackboardRequestError as exc:
            fallback = _fallback_asset_generation_output(context, asset_types, count)
            return fallback, {
                "provider": "fallback",
                "mode": mode,
                "used_advice": bool(advice and advice.strip()),
                "fallback_reason": str(exc),
            }

    fallback = _fallback_asset_generation_output(context, asset_types, count)
    return fallback, {
        "provider": "fallback",
        "mode": mode,
        "used_advice": bool(advice and advice.strip()),
        "fallback_reason": "Backboard not configured",
    }


def _fallback_email_personalization_output(
    context: dict,
    subject_line: str | None = None,
    max_contacts: int = 10,
) -> list[dict]:
    contacts = context.get("contacts", [])[:max_contacts]
    subject = subject_line or "Quick idea for your project launch"
    outputs = []
    for contact in contacts:
        name = contact.get("name") or "there"
        body = (
            f"Hi {name},<br/><br/>"
            "I built a focused launch workflow that helps technical builders get first users. "
            "Would you be open to a quick look and feedback?<br/><br/>"
            "Best,<br/>Growth Launchpad"
        )
        outputs.append({"contact_id": contact.get("id"), "subject": subject, "body": body})
    return outputs


def run_email_personalization_agent(
    context: dict,
    subject_line: str | None = None,
    max_contacts: int = 10,
    *,
    backboard: BackboardStageService | None = None,
    project_id: str | None = None,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[list[dict], dict]:
    if backboard and project_id:
        try:
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
        except BackboardRequestError as exc:
            fallback = _fallback_email_personalization_output(context, subject_line=subject_line, max_contacts=max_contacts)
            return fallback, {
                "provider": "fallback",
                "mode": mode,
                "used_advice": bool(advice and advice.strip()),
                "fallback_reason": str(exc),
            }

    fallback = _fallback_email_personalization_output(context, subject_line=subject_line, max_contacts=max_contacts)
    return fallback, {
        "provider": "fallback",
        "mode": mode,
        "used_advice": bool(advice and advice.strip()),
        "fallback_reason": "Backboard not configured",
    }
