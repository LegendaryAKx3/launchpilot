from datetime import datetime, timezone
import re
from typing import Any
from urllib.parse import urlparse
from uuid import UUID

import dns.resolver
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import delete, func
from sqlalchemy.orm import Session

from app.agents.lead_pipeline_agent import run_lead_enrichment_agent, run_lead_scout_agent
from app.agents.research_agent import run_research_agent
from app.agents.shared_context import build_project_context
from app.db.session import SessionLocal, get_db
from app.integrations.auth0_github_connector import Auth0GithubConnector
from app.integrations.backboard_client import BackboardRequestError
from app.integrations.github_client import GitHubClient
from app.models.chat import AgentChatMessage
from app.models.execution import Contact
from app.models.research import Competitor, OpportunityWedge, PainPointCluster, ResearchRun
from app.routers.utils import success
from app.schemas.research import ResearchRunRequest
from app.security.auth0 import CurrentUser, get_current_user
from app.security.permissions import require_scope
from app.services.audit_service import AuditService
from app.services.backboard_project_state_service import BackboardProjectStateService
from app.services.backboard_stage_service import BackboardStageService
from app.services.lead_scoring_service import score_enriched_leads
from app.services.memory_service import upsert_project_memory
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects/{project_id}/research", tags=["research"])
TEXT_FILE_EXTENSIONS = {
    ".md",
    ".txt",
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".sql",
}
EMAIL_PATTERN = re.compile(r"^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$", re.IGNORECASE)
EMAIL_FIND_PATTERN = re.compile(r"[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}", re.IGNORECASE)
PIPELINE_MEMORY_KEY = "research_pipeline_status"
DISALLOWED_EMAIL_DOMAINS = {
    "example.com",
    "test.com",
    "localhost",
    "invalid",
    "mailinator.com",
    "tempmail.com",
    "guerrillamail.com",
    "10minutemail.com",
}
FREE_EMAIL_DOMAINS = {
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
    "aol.com",
    "proton.me",
    "protonmail.com",
}
ALLOWED_ROLE_LOCAL_PARTS = {
    "info",
    "hello",
    "contact",
    "sales",
    "support",
    "partnerships",
    "business",
    "growth",
    "team",
}


def _is_text_candidate(path: str) -> bool:
    lowered = path.lower()
    return any(lowered.endswith(ext) for ext in TEXT_FILE_EXTENSIONS)


def _build_verified_github_context(
    *,
    access_token: str,
    owner: str,
    repo: str,
    branch: str | None,
    path: str | None,
    max_files: int,
    max_file_chars: int,
) -> dict[str, Any]:
    client = GitHubClient()
    try:
        repo_info = client.get_repo(access_token, owner, repo)
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code if exc.response else status.HTTP_502_BAD_GATEWAY
        if code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "GITHUB_REPO_UNAVAILABLE",
                    "message": "Repository was not found or is not accessible with current GitHub authorization.",
                },
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "GITHUB_VERIFY_FAILED", "message": "Failed verifying repository with GitHub."},
        ) from exc

    selected_branch = (branch or "").strip() or (repo_info.get("default_branch") or "")
    if selected_branch:
        try:
            branch_info = client.get_branch(access_token, owner, repo, selected_branch)
        except httpx.HTTPStatusError as exc:
            code = exc.response.status_code if exc.response else status.HTTP_502_BAD_GATEWAY
            if code == status.HTTP_404_NOT_FOUND:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"code": "GITHUB_BRANCH_NOT_FOUND", "message": f"Branch '{selected_branch}' not found."},
                ) from exc
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail={"code": "GITHUB_VERIFY_FAILED", "message": "Failed verifying branch with GitHub."},
            ) from exc
    else:
        branch_info = {"name": None, "sha": None}

    selected_path = (path or "").strip().lstrip("/")
    try:
        entries = client.list_path_contents(
            access_token,
            owner,
            repo,
            path=selected_path,
            ref=selected_branch or None,
        )
    except httpx.HTTPStatusError as exc:
        code = exc.response.status_code if exc.response else status.HTTP_502_BAD_GATEWAY
        if code == status.HTTP_404_NOT_FOUND:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "GITHUB_PATH_NOT_FOUND",
                    "message": f"Path '{selected_path or '/'}' not found in repository.",
                },
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"code": "GITHUB_VERIFY_FAILED", "message": "Failed verifying repository path with GitHub."},
        ) from exc

    file_entries = [entry for entry in entries if entry.get("type") == "file" and _is_text_candidate(entry.get("path", ""))]
    selected_files = file_entries[:max_files]
    file_snippets: list[dict[str, Any]] = []
    for entry in selected_files:
        file_path = entry.get("path")
        if not file_path:
            continue
        text = client.get_file_text(
            access_token,
            owner,
            repo,
            path=file_path,
            ref=selected_branch or None,
            max_chars=max_file_chars,
        )
        if not text:
            continue
        file_snippets.append(
            {
                "path": file_path,
                "size": entry.get("size"),
                "snippet": text,
            }
        )

    if not file_snippets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "GITHUB_NO_CONTEXT_FILES",
                "message": "No readable text files found at the specified repository path.",
            },
        )

    return {
        "verified_repo": True,
        "repo": repo_info,
        "branch": branch_info,
        "path": selected_path or "/",
        "files": file_snippets,
        "files_considered": len(file_entries),
        "files_included": len(file_snippets),
    }


def _parse_owner_repo_from_value(value: str) -> tuple[str, str] | None:
    raw = (value or "").strip()
    if not raw:
        return None

    if raw.startswith("http://") or raw.startswith("https://"):
        parsed = urlparse(raw)
        host = (parsed.netloc or "").lower()
        if host not in {"github.com", "www.github.com"}:
            return None
        parts = [part for part in parsed.path.strip("/").split("/") if part]
        if len(parts) < 2:
            return None
        owner, repo = parts[0], parts[1]
    else:
        parts = [part for part in raw.strip("/").split("/") if part]
        if len(parts) != 2:
            return None
        owner, repo = parts[0], parts[1]

    if repo.endswith(".git"):
        repo = repo[:-4]
    owner = owner.strip()
    repo = repo.strip()
    if not owner or not repo:
        return None
    return owner, repo


def _is_valid_email(value: str) -> bool:
    return bool(EMAIL_PATTERN.match((value or "").strip()))


def _is_business_email(email: str) -> bool:
    normalized = (email or "").strip().lower()
    if not _is_valid_email(normalized):
        return False
    domain = normalized.split("@")[-1]
    if domain in DISALLOWED_EMAIL_DOMAINS:
        return False
    if domain in FREE_EMAIL_DOMAINS:
        return False
    if domain.endswith(".local") or domain.endswith(".invalid"):
        return False
    return True


def _is_assumption_text(text: str | None) -> bool:
    return "assumption" in (text or "").strip().lower()


def _build_combined_contact_candidates(
    *,
    outreach_contacts: list[dict[str, Any]],
    ranked_leads: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    combined: list[dict[str, Any]] = []
    seen_emails: set[str] = set()

    for lead in ranked_leads:
        email = str(lead.get("contact_email") or "").strip().lower()
        if not _is_valid_email(email) or email in seen_emails:
            continue
        seen_emails.add(email)
        priority = lead.get("priority")
        if not isinstance(priority, int) or priority < 1:
            priority = len(combined) + 1
        reason = (
            f"Profitability score {lead.get('profitability_score', 0)}; "
            f"expected value ${lead.get('expected_value_usd', 0)}. "
            f"{str(lead.get('why_now') or '').strip()}"
        ).strip()
        combined.append(
            {
                "name": str(lead.get("contact_name") or "").strip() or None,
                "email": email,
                "company": str(lead.get("company_name") or "").strip() or None,
                "role": str(lead.get("contact_role") or "").strip() or None,
                "priority": priority,
                "reason": reason,
                "source": "lead_pipeline",
                "score": lead.get("profitability_score"),
                "expected_value_usd": lead.get("expected_value_usd"),
                "confidence": lead.get("confidence"),
                "evidence_urls": lead.get("evidence_urls") if isinstance(lead.get("evidence_urls"), list) else [],
            }
        )

    for idx, item in enumerate(outreach_contacts, start=1):
        email = str(item.get("email") or "").strip().lower()
        if not _is_valid_email(email) or email in seen_emails:
            continue
        seen_emails.add(email)
        priority = item.get("priority")
        if not isinstance(priority, int) or priority < 1:
            priority = idx
        combined.append(
            {
                "name": str(item.get("name") or "").strip() or None,
                "email": email,
                "company": str(item.get("company") or "").strip() or None,
                "role": str(item.get("role") or "").strip() or None,
                "priority": priority,
                "reason": str(item.get("reason") or "").strip() or None,
                "source": "research_agent",
            }
        )

    return combined


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fallback_enriched_leads_from_scout(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    role_to_local_part = [
        ("Head of Growth", "growth"),
        ("Marketing Lead", "marketing"),
        ("Partnerships Lead", "partnerships"),
        ("Founder", "founder"),
    ]
    leads: list[dict[str, Any]] = []
    for idx, candidate in enumerate(candidates, start=1):
        if not isinstance(candidate, dict):
            continue
        company_name = str(candidate.get("company_name") or "").strip()
        domain = str(candidate.get("domain") or "").strip().lower()
        if not company_name or not domain:
            continue
        role, local_part = role_to_local_part[(idx - 1) % len(role_to_local_part)]
        leads.append(
            {
                "company_name": company_name,
                "domain": domain,
                "website": candidate.get("website"),
                "contact_name": role,
                "contact_role": role,
                "contact_email": f"{local_part}@{domain}",
                "estimated_acv_usd": int(candidate.get("estimated_acv_usd") or 0),
                "estimated_close_probability": 0.22,
                "estimated_sales_cycle_days": 60,
                "fit_score": float(candidate.get("confidence") or 0.45),
                "risk_score": 0.45,
                "confidence": min(float(candidate.get("confidence") or 0.4), 0.55),
                "why_now": (
                    str(candidate.get("why_fit") or "").strip()
                    or "ASSUMPTION: Candidate aligns with ICP and likely has current buying trigger."
                ),
                "personalization_angle": "Reference current initiatives and offer a focused pilot.",
                "evidence_urls": candidate.get("evidence_urls") if isinstance(candidate.get("evidence_urls"), list) else [],
                "fallback_generated": True,
            }
        )
    return leads[:15]


def _fast_ranked_leads_from_research_output(output: dict[str, Any]) -> list[dict[str, Any]]:
    leads: list[dict[str, Any]] = []
    raw_contacts = output.get("outreach_contacts")
    if not isinstance(raw_contacts, list):
        return leads
    for idx, item in enumerate(raw_contacts, start=1):
        if not isinstance(item, dict):
            continue
        email = str(item.get("email") or "").strip().lower()
        if not _is_valid_email(email):
            continue
        company = str(item.get("company") or "").strip() or "Unknown"
        priority = item.get("priority")
        if not isinstance(priority, int) or priority < 1:
            priority = idx
        confidence = max(0.3, min(0.75, 0.78 - (priority * 0.03)))
        acv = max(3000, int(14000 - (priority * 600)))
        close_probability = max(0.08, min(0.35, 0.3 - (priority * 0.01)))
        risk = max(0.15, min(0.65, 0.25 + (priority * 0.02)))
        cycle_days = max(20, min(120, 45 + priority * 3))
        leads.append(
            {
                "company_name": company,
                "domain": email.split("@")[-1],
                "website": None,
                "contact_name": str(item.get("name") or "").strip() or None,
                "contact_role": str(item.get("role") or "").strip() or None,
                "contact_email": email,
                "estimated_acv_usd": acv,
                "estimated_close_probability": close_probability,
                "estimated_sales_cycle_days": cycle_days,
                "fit_score": confidence,
                "risk_score": risk,
                "confidence": confidence,
                "why_now": str(item.get("reason") or "").strip()
                or "Derived from research agent high-priority outreach contacts.",
                "personalization_angle": "Reference the identified pain and provide a low-friction pilot.",
                "evidence_urls": [],
                "fast_pipeline_generated": True,
            }
        )
    return score_enriched_leads(leads)[:15]


def _fallback_scout_candidates_from_research_output(output: dict[str, Any]) -> list[dict[str, Any]]:
    raw_contacts = output.get("outreach_contacts")
    if not isinstance(raw_contacts, list):
        return []
    candidates: list[dict[str, Any]] = []
    seen_domains: set[str] = set()
    for item in raw_contacts:
        if not isinstance(item, dict):
            continue
        email = str(item.get("email") or "").strip().lower()
        reason = str(item.get("reason") or "").strip()
        if not _is_business_email(email):
            continue
        if _is_assumption_text(reason):
            continue
        domain = email.split("@")[-1].strip().lower()
        if not domain or domain in seen_domains:
            continue
        seen_domains.add(domain)
        company = str(item.get("company") or "").strip() or domain.split(".")[0].title()
        why_fit = str(item.get("reason") or "").strip() or "Derived from research outreach contact evidence."
        candidates.append(
            {
                "company_name": company,
                "domain": domain,
                "website": f"https://{domain}",
                "industry": None,
                "location": None,
                "why_fit": why_fit,
                "estimated_acv_usd": 8000,
                "buying_signals": [why_fit],
                "evidence_urls": [],
                "confidence": 0.45,
                "fallback_generated": True,
            }
        )
    return candidates[:15]


def _prompt_requests_deepen(advice: str | None) -> bool:
    text = (advice or "").strip().lower()
    if not text:
        return False
    deepen_markers = [
        "deepen",
        "deep research",
        "go deeper",
        "full web",
        "full lead research",
        "use web tools",
        "backboard web",
    ]
    return any(marker in text for marker in deepen_markers)


def _new_pipeline_status(*, mode: str, advice: str | None) -> dict[str, Any]:
    return {
        "status": "running",
        "mode": mode,
        "advice_present": bool((advice or "").strip()),
        "current_stage": "research_analysis",
        "started_at": _iso_now(),
        "updated_at": _iso_now(),
        "steps": [
            {"id": "research_analysis", "label": "Analyze market and competitors", "status": "pending"},
            {"id": "lead_scout", "label": "Discover target companies", "status": "pending"},
            {"id": "lead_enrichment", "label": "Find decision-makers and emails", "status": "pending"},
            {"id": "lead_scoring", "label": "Rank leads by expected value", "status": "pending"},
            {"id": "contacts_sync", "label": "Add qualified leads to execution contacts", "status": "pending"},
        ],
        "summary": {},
    }


def _set_step_status(
    pipeline_status: dict[str, Any],
    *,
    step_id: str,
    status: str,
    details: dict[str, Any] | None = None,
) -> None:
    steps = pipeline_status.get("steps")
    if not isinstance(steps, list):
        return
    for step in steps:
        if not isinstance(step, dict) or step.get("id") != step_id:
            continue
        step["status"] = status
        if status == "in_progress":
            step["started_at"] = step.get("started_at") or _iso_now()
            pipeline_status["current_stage"] = step_id
        if status in {"completed", "failed"}:
            step["completed_at"] = _iso_now()
        if details:
            step["details"] = details
        pipeline_status["updated_at"] = _iso_now()
        return


def _persist_pipeline_status(db: Session, project_id: UUID, pipeline_status: dict[str, Any]) -> None:
    upsert_project_memory(
        db,
        project_id,
        PIPELINE_MEMORY_KEY,
        pipeline_status,
        "agent_output",
        "system",
    )
    db.commit()


def _upsert_contact_candidates(
    *,
    db: Session,
    project_id: UUID,
    contact_candidates: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    contacts_upserted: list[dict[str, Any]] = []
    for idx, item in enumerate(contact_candidates, start=1):
        email = str(item.get("email") or "").strip().lower()
        if not _is_business_email(email):
            continue
        priority = item.get("priority")
        if not isinstance(priority, int) or priority < 1:
            priority = idx
        name = str(item.get("name") or "").strip() or None
        company = str(item.get("company") or "").strip() or None
        role = str(item.get("role") or "").strip() or None
        reason = str(item.get("reason") or "").strip() or None
        source = str(item.get("source") or "research_agent")
        if _is_assumption_text(reason):
            continue
        segment = f"{'profit' if source == 'lead_pipeline' else 'research'}_priority_{priority}"
        note_parts = [f"Priority {priority} contact sourced by research agent."]
        if source == "lead_pipeline":
            note_parts = [f"Priority {priority} contact sourced by lead pipeline."]
        score = item.get("score")
        expected_value_usd = item.get("expected_value_usd")
        confidence = item.get("confidence")
        if role:
            note_parts.append(f"Role: {role}")
        if reason:
            note_parts.append(f"Reason: {reason}")
        if isinstance(score, (int, float)):
            note_parts.append(f"Profitability score: {score}")
        if isinstance(expected_value_usd, int):
            note_parts.append(f"Expected value USD: {expected_value_usd}")
        if isinstance(confidence, (int, float)):
            note_parts.append(f"Confidence: {round(float(confidence), 3)}")
        evidence_urls = item.get("evidence_urls")
        if isinstance(evidence_urls, list) and evidence_urls:
            note_parts.append(f"Evidence: {' | '.join(str(url) for url in evidence_urls[:3])}")
        why_selected = reason or "Matched target profile and scored above outreach threshold."
        note_parts.insert(1, f"Why selected: {why_selected}")
        personalization_notes = " ".join(note_parts)

        row = (
            db.query(Contact)
            .filter(
                Contact.project_id == project_id,
                func.lower(Contact.email) == email,
            )
            .order_by(Contact.created_at.desc())
            .first()
        )
        if row:
            row.name = name or row.name
            row.email = email
            row.company = company or row.company
            row.segment = segment
            row.personalization_notes = personalization_notes
            row.source = source
        else:
            row = Contact(
                project_id=project_id,
                name=name,
                email=email,
                company=company,
                segment=segment,
                personalization_notes=personalization_notes,
                source=source,
            )
            db.add(row)
            db.flush()

        contacts_upserted.append(
            {
                "id": str(row.id),
                "name": row.name,
                "email": row.email,
                "company": row.company,
                "segment": row.segment,
                "source": row.source,
                "priority": priority,
                "reason": reason,
            }
        )
    return contacts_upserted


def _extract_public_emails_for_domain(domain: str) -> set[str]:
    normalized_domain = (domain or "").strip().lower()
    if not normalized_domain:
        return set()
    urls = [
        f"https://{normalized_domain}",
        f"https://{normalized_domain}/contact",
        f"https://{normalized_domain}/about",
    ]
    found: set[str] = set()
    headers = {"User-Agent": "launchpilot-lead-verifier/1.0"}
    with httpx.Client(timeout=5.0, follow_redirects=True, headers=headers) as client:
        for url in urls:
            try:
                response = client.get(url)
            except Exception:  # noqa: BLE001
                continue
            if response.status_code >= 400:
                continue
            text = response.text or ""
            for match in EMAIL_FIND_PATTERN.findall(text):
                email = match.strip().lower()
                if _is_business_email(email):
                    found.add(email)
    return found


def _domain_has_mx(domain: str) -> bool:
    normalized_domain = (domain or "").strip().lower()
    if not normalized_domain:
        return False
    try:
        answers = dns.resolver.resolve(normalized_domain, "MX")
        return bool(list(answers))
    except Exception:  # noqa: BLE001
        return False


def _filter_verified_contact_candidates(contact_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    verified: list[dict[str, Any]] = []
    domain_cache: dict[str, set[str]] = {}
    mx_cache: dict[str, bool] = {}
    for item in contact_candidates:
        email = str(item.get("email") or "").strip().lower()
        if not _is_business_email(email):
            continue
        domain = email.split("@")[-1]
        local_part = email.split("@")[0]
        if domain not in domain_cache:
            domain_cache[domain] = _extract_public_emails_for_domain(domain)
        if domain not in mx_cache:
            mx_cache[domain] = _domain_has_mx(domain)
        published_emails = domain_cache[domain]
        if email in published_emails:
            verified.append(item)
            continue
        # Fallback: accept common business role inboxes when domain has MX.
        if mx_cache[domain] and local_part in ALLOWED_ROLE_LOCAL_PARTS:
            fallback_item = dict(item)
            fallback_item["reason"] = (
                (str(item.get("reason") or "").strip() + " ")
                + "Verified domain MX; accepted common role inbox."
            ).strip()
            verified.append(fallback_item)
    return verified


def _filter_initial_contact_candidates(contact_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    initial: list[dict[str, Any]] = []
    for item in contact_candidates:
        email = str(item.get("email") or "").strip().lower()
        reason = str(item.get("reason") or "").strip()
        if not _is_business_email(email):
            continue
        if _is_assumption_text(reason):
            continue
        initial.append(item)
    return initial


def _run_lead_pipeline_background(
    *,
    project_id: UUID,
    context: dict[str, Any],
    mode: str,
    advice: str | None,
    research_output: dict[str, Any],
) -> None:
    db = SessionLocal()
    pipeline_status = _new_pipeline_status(mode=mode, advice=advice)
    try:
        backboard = BackboardStageService(db)
        _set_step_status(
            pipeline_status,
            step_id="research_analysis",
            status="completed",
            details={
                "competitors": len(research_output.get("competitors", [])),
                "pain_point_clusters": len(research_output.get("pain_point_clusters", [])),
                "opportunity_wedges": len(research_output.get("opportunity_wedges", [])),
                "outreach_contacts": len(research_output.get("outreach_contacts", [])),
            },
        )
        _persist_pipeline_status(db, project_id, pipeline_status)

        _set_step_status(pipeline_status, step_id="lead_scout", status="in_progress")
        _persist_pipeline_status(db, project_id, pipeline_status)
        scout_output = {
            "candidates": _fallback_scout_candidates_from_research_output(research_output),
            "summary": "Strict fast mode: skipped scout web calls and derived candidates from research output.",
        }
        scout_trace = {
            "provider": "fast_mode",
            "mode": mode,
            "used_advice": bool(advice),
            "assistant_id": None,
            "thread_id": None,
        }

        _set_step_status(
            pipeline_status,
            step_id="lead_scout",
            status="completed",
            details={
                "candidates": len(scout_output.get("candidates", [])),
                "retry_used": False,
                "fallback_used": True,
                "fast_mode": True,
                "strict_fast_mode": True,
            },
        )
        _persist_pipeline_status(db, project_id, pipeline_status)

        _set_step_status(pipeline_status, step_id="lead_enrichment", status="in_progress")
        _persist_pipeline_status(db, project_id, pipeline_status)
        enrichment_fallback_used = True
        enrichment_output = {
            "leads": _fast_ranked_leads_from_research_output(research_output),
            "summary": "Strict fast mode: skipped enrichment web calls and derived leads from research output.",
        }
        enrichment_trace = {
            "provider": "fast_mode",
            "mode": mode,
            "used_advice": bool(advice),
            "assistant_id": None,
            "thread_id": None,
        }

        _set_step_status(
            pipeline_status,
            step_id="lead_enrichment",
            status="completed",
            details={
                "enriched_leads": len(enrichment_output.get("leads", [])),
                "fallback_used": enrichment_fallback_used,
                "fast_mode": True,
                "strict_fast_mode": True,
            },
        )
        _persist_pipeline_status(db, project_id, pipeline_status)

        _set_step_status(pipeline_status, step_id="lead_scoring", status="in_progress")
        _persist_pipeline_status(db, project_id, pipeline_status)
        scored_leads = enrichment_output.get("leads", [])
        ranked_leads = [
            lead
            for lead in scored_leads
            if _is_valid_email(str(lead.get("contact_email") or ""))
            and float(lead.get("confidence") or 0) >= 0.35
            and float(lead.get("profitability_score") or 0) >= 25.0
        ][:15]
        _set_step_status(
            pipeline_status,
            step_id="lead_scoring",
            status="completed",
            details={"scored_count": len(scored_leads), "qualified_count": len(ranked_leads)},
        )
        _persist_pipeline_status(db, project_id, pipeline_status)

        upsert_project_memory(
            db,
            project_id,
            "lead_scoring_last_output",
            {
                "inputs": {"enriched_leads_count": len(enrichment_output.get("leads", []))},
                "scored_count": len(scored_leads),
                "qualified_count": len(ranked_leads),
                "top_leads": ranked_leads[:10],
            },
            "agent_output",
            "system",
        )
        upsert_project_memory(
            db,
            project_id,
            "lead_ranked_last_output",
            {
                "status": "ok",
                "ranked_leads": ranked_leads,
                "scout": {
                    "summary": scout_output.get("summary", ""),
                    "candidate_count": len(scout_output.get("candidates", [])),
                    "agent_trace": scout_trace,
                },
                "enrichment": {
                    "summary": enrichment_output.get("summary", ""),
                    "lead_count": len(enrichment_output.get("leads", [])),
                    "agent_trace": enrichment_trace,
                },
            },
            "agent_output",
            "system",
        )

        _set_step_status(pipeline_status, step_id="contacts_sync", status="in_progress")
        _persist_pipeline_status(db, project_id, pipeline_status)
        contact_candidates = _build_combined_contact_candidates(outreach_contacts=[], ranked_leads=ranked_leads)
        verified_candidates = _filter_verified_contact_candidates(contact_candidates)
        contacts_upserted = _upsert_contact_candidates(
            db=db,
            project_id=project_id,
            contact_candidates=verified_candidates,
        )
        db.commit()

        _set_step_status(
            pipeline_status,
            step_id="contacts_sync",
            status="completed",
            details={
                "candidates_considered": len(contact_candidates),
                "verified_candidates": len(verified_candidates),
                "contacts_upserted": len(contacts_upserted),
            },
        )
        pipeline_status["summary"] = {
            "competitors": len(research_output.get("competitors", [])),
            "pain_point_clusters": len(research_output.get("pain_point_clusters", [])),
            "opportunity_wedges": len(research_output.get("opportunity_wedges", [])),
            "ranked_leads": len(ranked_leads),
            "contacts_upserted": len(contacts_upserted),
        }
        pipeline_status["status"] = "completed"
        pipeline_status["completed_at"] = _iso_now()
        pipeline_status["updated_at"] = _iso_now()
        _persist_pipeline_status(db, project_id, pipeline_status)
        BackboardProjectStateService(db).sync_after_action(
            project_id=str(project_id),
            reason="research.lead_pipeline_async",
            stage="research",
            extra={"qualified_leads": len(ranked_leads), "contacts_upserted": len(contacts_upserted)},
        )
    except Exception as exc:  # noqa: BLE001
        current_stage = str(pipeline_status.get("current_stage") or "lead_scout")
        if current_stage not in {"lead_scout", "lead_enrichment", "lead_scoring", "contacts_sync"}:
            current_stage = "lead_scout"
        _set_step_status(pipeline_status, step_id=current_stage, status="failed", details={"error": str(exc)})
        pipeline_status["status"] = "error"
        pipeline_status["error"] = f"lead_pipeline_failed:{exc}"
        _persist_pipeline_status(db, project_id, pipeline_status)
    finally:
        db.close()


def _build_repo_summary_for_memory(github_repo_context: dict[str, Any], *, project_id: str) -> dict[str, Any]:
    files = github_repo_context.get("files")
    if not isinstance(files, list):
        files = []

    extension_counts: dict[str, int] = {}
    summarized_files: list[dict[str, Any]] = []
    for file_item in files:
        if not isinstance(file_item, dict):
            continue
        path = str(file_item.get("path") or "")
        snippet = str(file_item.get("snippet") or "")
        size = file_item.get("size")
        extension = ""
        if "." in path:
            extension = f".{path.split('.')[-1].lower()}"
            extension_counts[extension] = extension_counts.get(extension, 0) + 1
        first_non_empty_line = ""
        for line in snippet.splitlines():
            line = line.strip()
            if line:
                first_non_empty_line = line[:180]
                break
        summarized_files.append(
            {
                "path": path,
                "size": size,
                "extension": extension or None,
                "line_count_estimate": len(snippet.splitlines()),
                "first_line_preview": first_non_empty_line or None,
            }
        )

    top_extensions = sorted(extension_counts.items(), key=lambda item: item[1], reverse=True)[:10]
    return {
        "project_id": project_id,
        "repo": github_repo_context.get("repo"),
        "branch": github_repo_context.get("branch"),
        "path": github_repo_context.get("path"),
        "files_considered": github_repo_context.get("files_considered"),
        "files_included": github_repo_context.get("files_included"),
        "top_extensions": [{"extension": ext, "count": count} for ext, count in top_extensions],
        "files": summarized_files,
    }


@router.post("/run")
def run_research(
    project_id: UUID,
    payload: ResearchRunRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("research:run")),
    db: Session = Depends(get_db),
):
    project = ProjectService(db).get_project_or_404(project_id)
    pipeline_status = _new_pipeline_status(mode=payload.mode, advice=payload.advice)
    _persist_pipeline_status(db, project_id, pipeline_status)
    _set_step_status(pipeline_status, step_id="research_analysis", status="in_progress")
    _persist_pipeline_status(db, project_id, pipeline_status)

    context = build_project_context(db, project_id)
    backboard = BackboardStageService(db)
    extra_task_instructions: str | None = None
    github_repo_context = {"included": False, "reason": "not_requested"}
    if payload.github_repo:
        if "repo:read" not in current_user.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "MISSING_SCOPE", "message": "repo:read scope is required for GitHub repo context."},
            )
        connector = Auth0GithubConnector()
        token = connector.github_access_token(current_user.sub)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "GITHUB_NOT_LINKED", "message": "GitHub is not linked for this user."},
            )

        github_repo_context = _build_verified_github_context(
            access_token=token,
            owner=payload.github_repo.owner,
            repo=payload.github_repo.repo,
            branch=payload.github_repo.branch,
            path=payload.github_repo.path,
            max_files=payload.github_repo.max_files,
            max_file_chars=payload.github_repo.max_file_chars,
        )
        context["github_repo"] = github_repo_context
        extra_task_instructions = (
            "Use only the verified GitHub repository context in github_repo.files. "
            "If context is missing for a requested file, state that limitation explicitly."
        )
    elif project.repo_url and "repo:read" in current_user.scopes:
        connector = Auth0GithubConnector()
        token = connector.github_access_token(current_user.sub)
        parsed = _parse_owner_repo_from_value(project.repo_url)
        if token and parsed:
            owner, repo_name = parsed
            github_repo_context = _build_verified_github_context(
                access_token=token,
                owner=owner,
                repo=repo_name,
                branch=None,
                path=None,
                max_files=6,
                max_file_chars=5000,
            )
            github_repo_context["source"] = "project_repo_url"
            context["github_repo"] = github_repo_context
            extra_task_instructions = (
                "Use the verified repository from project.repo_url in github_repo.files as primary context. "
                "Do not invent repository details that are not present in those files."
            )
        elif not token:
            github_repo_context = {"included": False, "reason": "github_not_linked"}
        else:
            github_repo_context = {"included": False, "reason": "invalid_project_repo_url"}

    if "repo:read" in current_user.scopes and "github_repo" not in context:
        connector = Auth0GithubConnector()
        token = connector.github_access_token(current_user.sub)
        if token:
            try:
                repos = GitHubClient().list_user_repos(token, per_page=20)
                github_repo_context = {
                    "included": True,
                    "repo_count": len(repos),
                }
                context["github"] = {
                    "repos": repos,
                    "note": "GitHub repositories linked through Auth0 identity.",
                }
            except Exception as exc:  # noqa: BLE001
                github_repo_context = {"included": False, "reason": f"github_fetch_failed:{exc}"}
        else:
            github_repo_context = {"included": False, "reason": "github_not_linked"}
    elif "repo:read" not in current_user.scopes:
        github_repo_context = {"included": False, "reason": "missing_repo_read_scope"}

    if "github_repo" in context:
        repo_summary = _build_repo_summary_for_memory(context["github_repo"], project_id=str(project_id))
        try:
            repo_memory_sync = backboard.persist_repo_summary_memory(
                project_id=str(project_id),
                project_name=project.name or "project",
                repo_summary=repo_summary,
            )
            github_repo_context["backboard_memory_sync"] = {"status": "ok", **repo_memory_sync}
        except BackboardRequestError as exc:
            github_repo_context["backboard_memory_sync"] = {
                "status": "error",
                "error": str(exc),
            }

    if payload.pinned_wedge_ids:
        context["pinned_wedge_ids"] = [str(item) for item in payload.pinned_wedge_ids]
    try:
        output, trace = run_research_agent(
            context,
            backboard=backboard,
            project_id=str(project_id),
            advice=payload.advice,
            mode=payload.mode,
            extra_task_instructions=extra_task_instructions,
        )
        _set_step_status(
            pipeline_status,
            step_id="research_analysis",
            status="completed",
            details={
                "competitors": len(output.get("competitors", [])),
                "pain_point_clusters": len(output.get("pain_point_clusters", [])),
                "opportunity_wedges": len(output.get("opportunity_wedges", [])),
                "outreach_contacts": len(output.get("outreach_contacts", [])),
            },
        )
        _persist_pipeline_status(db, project_id, pipeline_status)
    except BackboardRequestError as exc:
        _set_step_status(
            pipeline_status,
            step_id="research_analysis",
            status="failed",
            details={"error": str(exc)},
        )
        pipeline_status["status"] = "error"
        pipeline_status["error"] = f"research_analysis_failed:{exc}"
        _persist_pipeline_status(db, project_id, pipeline_status)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Backboard research failed: {exc}")

    lead_pipeline: dict[str, Any] = {
        "status": "running",
        "async": True,
        "message": "Lead discovery and ranking is running in the background.",
    }

    run = ResearchRun(
        project_id=project_id,
        status="succeeded",
        summary=output.get("summary"),
        completed_at=datetime.now(timezone.utc),
    )
    db.add(run)

    db.execute(delete(Competitor).where(Competitor.project_id == project_id))
    db.execute(delete(PainPointCluster).where(PainPointCluster.project_id == project_id))
    db.execute(delete(OpportunityWedge).where(OpportunityWedge.project_id == project_id))

    for item in output.get("competitors", []):
        name = item.get("name")
        if not name:
            continue
        db.add(
            Competitor(
                project_id=project_id,
                name=name,
                positioning=item.get("positioning"),
                pricing_summary=item.get("pricing_summary"),
                strengths=item.get("strengths", []),
                weaknesses=item.get("weaknesses", []),
            )
        )

    for idx, item in enumerate(output.get("pain_point_clusters", []), start=1):
        label = item.get("label")
        if not label:
            continue
        db.add(
            PainPointCluster(
                project_id=project_id,
                label=label,
                description=item.get("description"),
                evidence=item.get("evidence", []),
                rank=idx,
            )
        )

    for item in output.get("opportunity_wedges", []):
        label = item.get("label")
        if not label:
            continue
        db.add(
            OpportunityWedge(
                project_id=project_id,
                label=label,
                description=item.get("description"),
                score=item.get("score"),
                status="candidate",
            )
        )

    initial_contact_candidates = _build_combined_contact_candidates(
        outreach_contacts=output.get("outreach_contacts", []),
        ranked_leads=[],
    )
    contacts_upserted = _upsert_contact_candidates(
        db=db,
        project_id=project_id,
        contact_candidates=_filter_initial_contact_candidates(initial_contact_candidates),
    )
    pipeline_status["summary"] = {
        "competitors": len(output.get("competitors", [])),
        "pain_point_clusters": len(output.get("pain_point_clusters", [])),
        "opportunity_wedges": len(output.get("opportunity_wedges", [])),
        "ranked_leads": 0,
        "contacts_upserted": len(contacts_upserted),
    }

    upsert_project_memory(
        db,
        project_id,
        "recommended_wedge_candidates",
        {"wedges": [w["label"] for w in output.get("opportunity_wedges", [])]},
        "fact",
        "agent",
    )
    if output.get("chat_message"):
        db.add(
            AgentChatMessage(
                project_id=str(project_id),
                agent_type="research",
                role="assistant",
                content=str(output.get("chat_message") or ""),
                message_metadata={
                    "source": "agent_run",
                    "mode": payload.mode,
                    "next_step_suggestion": output.get("next_step_suggestion"),
                },
            )
        )

    project.stage = "research"
    AuditService(db).log(
        project_id,
        "agent",
        "research_agent",
        "research.generated",
        "research_run",
        str(run.id),
        metadata={
            "agent_trace": trace,
            "mode": payload.mode,
            "advice": payload.advice,
            "github_repo_context": github_repo_context,
            "outreach_contacts_generated": len(output.get("outreach_contacts", [])),
            "outreach_contacts_upserted": len(contacts_upserted),
            "lead_pipeline_status": lead_pipeline.get("status"),
            "lead_pipeline_qualified_count": 0,
        },
    )

    db.commit()
    pipeline_status["status"] = "running"
    pipeline_status["updated_at"] = _iso_now()
    _persist_pipeline_status(db, project_id, pipeline_status)
    background_tasks.add_task(
        _run_lead_pipeline_background,
        project_id=project_id,
        context=context,
        mode=payload.mode,
        advice=payload.advice,
        research_output=output,
    )
    BackboardProjectStateService(db).sync_after_action(
        project_id=str(project_id),
        reason="research.run",
        stage="research",
        extra={"mode": payload.mode, "used_advice": bool(payload.advice)},
    )

    return success(
        {
            "agent_trace": trace,
            "run": {
                "id": str(run.id),
                "status": run.status,
                "summary": run.summary,
                "saturation_score": float(run.saturation_score or 0) if run.saturation_score is not None else None,
            },
            "competitors": output.get("competitors", []),
            "pain_point_clusters": output.get("pain_point_clusters", []),
            "opportunity_wedges": output.get("opportunity_wedges", []),
            "outreach_contacts": output.get("outreach_contacts", []),
            "contacts_upserted": contacts_upserted,
            "chat_message": output.get("chat_message", ""),
            "next_step_suggestion": output.get("next_step_suggestion", ""),
            "should_move_to_next_stage": bool(output.get("should_move_to_next_stage")),
            "next_stage": output.get("next_stage", "research"),
            "github_repo_context": github_repo_context,
            "lead_pipeline": lead_pipeline,
        }
    )


@router.post("/advise")
def advise_research(
    project_id: UUID,
    payload: ResearchRunRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user),
    _scope: CurrentUser = Depends(require_scope("research:run")),
    db: Session = Depends(get_db),
):
    return run_research(
        project_id=project_id,
        payload=payload,
        background_tasks=background_tasks,
        current_user=current_user,
        _scope=_scope,
        db=db,
    )


@router.get("")
def get_research_snapshot(
    project_id: UUID,
    _scope: CurrentUser = Depends(require_scope("project:read")),
    db: Session = Depends(get_db),
):
    ProjectService(db).get_project_or_404(project_id)
    latest_run = (
        db.query(ResearchRun)
        .filter(ResearchRun.project_id == project_id)
        .order_by(ResearchRun.created_at.desc())
        .first()
    )
    competitors = db.query(Competitor).filter(Competitor.project_id == project_id).all()
    pains = db.query(PainPointCluster).filter(PainPointCluster.project_id == project_id).all()
    wedges = db.query(OpportunityWedge).filter(OpportunityWedge.project_id == project_id).all()

    return success(
        {
            "run": {
                "id": str(latest_run.id) if latest_run else None,
                "status": latest_run.status if latest_run else "not_started",
                "summary": latest_run.summary if latest_run else None,
                "saturation_score": float(latest_run.saturation_score or 0) if latest_run else None,
            },
            "competitors": [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "url": c.url,
                    "category": c.category,
                    "positioning": c.positioning,
                    "pricing_summary": c.pricing_summary,
                    "strengths": c.strengths,
                    "weaknesses": c.weaknesses,
                }
                for c in competitors
            ],
            "pain_point_clusters": [
                {
                    "id": str(p.id),
                    "label": p.label,
                    "description": p.description,
                    "rank": p.rank,
                    "evidence": p.evidence,
                }
                for p in pains
            ],
            "opportunity_wedges": [
                {
                    "id": str(w.id),
                    "label": w.label,
                    "description": w.description,
                    "score": float(w.score or 0),
                    "status": w.status,
                }
                for w in wedges
            ],
        }
    )
