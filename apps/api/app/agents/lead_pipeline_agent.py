from __future__ import annotations

from urllib.parse import urlparse

from app.prompts.lead_enrichment_prompt import LEAD_ENRICHMENT_PROMPT
from app.prompts.lead_scout_prompt import LEAD_SCOUT_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def _project_name(context: dict) -> str:
    return context.get("project", {}).get("name") or "project"


def _clamp01(value: object, default: float = 0.5) -> float:
    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))
    return default


def _clean_domain(value: str | None) -> str | None:
    raw = (value or "").strip().lower()
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        raw = parsed.netloc.lower()
    raw = raw.replace("www.", "")
    raw = raw.strip("/")
    return raw or None


def _clean_urls(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    out: list[str] = []
    for item in raw:
        url = str(item or "").strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            continue
        out.append(url)
    # Keep order, dedupe.
    deduped = list(dict.fromkeys(out))
    return deduped[:5]


def run_lead_scout_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=_project_name(context),
        stage="lead_scout",
        system_prompt=LEAD_SCOUT_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            "Use web search and website evidence when available. "
            "Return candidate companies only; do not produce outreach copy."
        ),
    )

    candidates: list[dict] = []
    if isinstance(response.get("candidates"), list):
        for item in response["candidates"]:
            if not isinstance(item, dict):
                continue
            company_name = str(item.get("company_name") or "").strip()
            domain = _clean_domain(str(item.get("domain") or ""))
            website = str(item.get("website") or "").strip() or None
            if not company_name:
                continue
            if not domain and website:
                domain = _clean_domain(website)
            acv = item.get("estimated_acv_usd")
            if not isinstance(acv, int):
                acv = 0
            signals = item.get("buying_signals") if isinstance(item.get("buying_signals"), list) else []
            signals = [str(s).strip() for s in signals if str(s).strip()][:6]

            candidates.append(
                {
                    "company_name": company_name,
                    "domain": domain,
                    "website": website,
                    "industry": str(item.get("industry") or "").strip() or None,
                    "location": str(item.get("location") or "").strip() or None,
                    "why_fit": str(item.get("why_fit") or "").strip() or None,
                    "estimated_acv_usd": max(0, acv),
                    "buying_signals": signals,
                    "evidence_urls": _clean_urls(item.get("evidence_urls")),
                    "confidence": _clamp01(item.get("confidence"), 0.5),
                }
            )

    # Deduplicate by domain/company name while preserving order.
    seen: set[str] = set()
    deduped: list[dict] = []
    for c in candidates:
        key = (c.get("domain") or c.get("company_name") or "").lower()
        if not key or key in seen:
            continue
        seen.add(key)
        deduped.append(c)

    normalized = {
        "candidates": deduped[:25],
        "summary": str(response.get("summary") or "").strip(),
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }


def run_lead_enrichment_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=_project_name(context),
        stage="lead_enrichment",
        system_prompt=LEAD_ENRICHMENT_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            "Use lead_scout_candidates from context as the primary company set. "
            "Return enriched outreach-ready leads with most likely decision-maker emails and evidence URLs."
        ),
    )

    leads: list[dict] = []
    if isinstance(response.get("leads"), list):
        for item in response["leads"]:
            if not isinstance(item, dict):
                continue
            company_name = str(item.get("company_name") or "").strip()
            email = str(item.get("contact_email") or "").strip().lower()
            if not company_name or not email:
                continue
            acv = item.get("estimated_acv_usd")
            days = item.get("estimated_sales_cycle_days")
            if not isinstance(acv, int):
                acv = 0
            if not isinstance(days, int):
                days = 90
            leads.append(
                {
                    "company_name": company_name,
                    "domain": _clean_domain(str(item.get("domain") or "")),
                    "website": str(item.get("website") or "").strip() or None,
                    "contact_name": str(item.get("contact_name") or "").strip() or None,
                    "contact_role": str(item.get("contact_role") or "").strip() or None,
                    "contact_email": email,
                    "estimated_acv_usd": max(0, acv),
                    "estimated_close_probability": _clamp01(item.get("estimated_close_probability"), 0.25),
                    "estimated_sales_cycle_days": max(1, days),
                    "fit_score": _clamp01(item.get("fit_score"), 0.5),
                    "risk_score": _clamp01(item.get("risk_score"), 0.5),
                    "confidence": _clamp01(item.get("confidence"), 0.4),
                    "why_now": str(item.get("why_now") or "").strip() or None,
                    "personalization_angle": str(item.get("personalization_angle") or "").strip() or None,
                    "evidence_urls": _clean_urls(item.get("evidence_urls")),
                }
            )

    # Deduplicate by email.
    deduped: list[dict] = []
    seen_emails: set[str] = set()
    for lead in leads:
        key = lead["contact_email"]
        if key in seen_emails:
            continue
        seen_emails.add(key)
        deduped.append(lead)

    normalized = {
        "leads": deduped[:20],
        "summary": str(response.get("summary") or "").strip(),
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }
