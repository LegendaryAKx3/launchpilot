from __future__ import annotations

from app.prompts.execution_prompt import EXECUTION_PROMPT
from app.prompts.distribution_prompt import DISTRIBUTION_ASSETS_PROMPT
from app.prompts.writing_agent_prompt import WRITING_AGENT_SYSTEM_PROMPT, PLAN_GENERATION_PROMPT
from app.services.backboard_stage_service import BackboardStageService


def _project_name(context: dict) -> str:
    return context.get("project", {}).get("name") or "project"


def _normalize_launch_strategy(raw: dict | None, context: dict) -> dict:
    strategy = raw if isinstance(raw, dict) else {}
    primary = str(strategy.get("primary_channel") or "").strip() or "content + outreach"
    secondary = strategy.get("secondary_channels")
    if not isinstance(secondary, list):
        secondary = []
    secondary = [str(item).strip() for item in secondary if str(item).strip()][:3]
    why = str(strategy.get("why") or "").strip()
    if not why:
        audience = context.get("brief", {}).get("audience") or "target users"
        why = f"Fastest channel mix to reach {audience}, get feedback quickly, and iterate within 7 days."
    return {"primary_channel": primary, "secondary_channels": secondary, "why": why}


def _normalize_tasks(raw_tasks: list | None, context: dict) -> list[dict]:
    """Normalize tasks ensuring 2-3 tasks per day minimum."""
    tasks: list[dict] = []
    tasks_per_day: dict[int, list[dict]] = {d: [] for d in range(1, 8)}

    if isinstance(raw_tasks, list):
        for item in raw_tasks:
            if not isinstance(item, dict):
                continue
            day = item.get("day_number")
            if not isinstance(day, int) or day < 1 or day > 7:
                continue
            title = str(item.get("title") or "").strip()
            description = str(item.get("description") or "").strip()
            if not title:
                continue
            priority = item.get("priority")
            if not isinstance(priority, int):
                priority = len(tasks_per_day[day]) + 1
            priority = max(1, min(10, priority))
            task = {
                "day_number": day,
                "title": title,
                "description": description,
                "priority": priority,
            }
            tasks_per_day[day].append(task)
            tasks.append(task)

    # Ensure each day has at least 2-3 tasks with comprehensive fallbacks
    project_name = _project_name(context)
    fallbacks_by_day = {
        1: [
            ("Finalize landing page copy", f"Review headline, subhead, and CTA for {project_name}. Ensure value prop is clear in first 5 seconds. Test on 3 people who don't know the product."),
            ("Set up analytics and tracking", "Install analytics (Plausible/GA4), set up conversion funnels for signup flow, test that all events fire correctly."),
            ("Create launch announcement draft", "Write 3 subject line variations for launch email, draft body copy, prep for internal review."),
        ],
        2: [
            ("Record short-form video content", "Film 3 TikTok/Reels variations of main value prop. Each under 60 seconds, test different hooks."),
            ("Write cold outreach templates", "Create 3 DM templates and 2 email templates targeting different audience segments."),
            ("Design social proof graphics", "Create quote cards from beta testers, before/after metrics visuals if available."),
        ],
        3: [
            ("Build target contact list", "Identify 50 relevant accounts to reach out to. Document why each is a fit and personalization notes."),
            ("Send first batch of DMs", "Send 20 personalized cold DMs using templates from Day 2. Track response rates."),
            ("Prep launch platform assets", "Tagline, description, first comment, maker story for Product Hunt or similar."),
        ],
        4: [
            ("Execute soft launch", "Send first email wave to warm list, announce on primary social channel, monitor initial response."),
            ("Track initial metrics", "Document open rates, click rates, replies, signups. Note qualitative feedback patterns."),
            ("Engage with early responses", "Reply to all comments and DMs within 2 hours. Capture testimonials from happy early users."),
        ],
        5: [
            ("Analyze Day 4 results", "Review all metrics, identify what's working vs not. Document specific insights for iteration."),
            ("Iterate on creative", "Adjust copy, visuals, and hooks based on response patterns. Create v2 of underperforming assets."),
            ("Send follow-up messages", "Follow up with non-responders from Day 3-4 outreach using different angle."),
        ],
        6: [
            ("Launch second wave", "Deploy improved variants to new segment. Test against Day 4 baseline performance."),
            ("Expand outreach", "Send next batch of 30 DMs/emails to fresh contacts using winning templates."),
            ("Collect and share wins", "Screenshot positive feedback, create case study draft from best early result."),
        ],
        7: [
            ("Compile final metrics report", "Document all KPIs: signups, conversion rates, engagement, revenue if applicable."),
            ("Conduct post-launch review", "What worked, what didn't, what to double down on. Write key learnings doc."),
            ("Decide next phase", "Based on results: scale winning channels, iterate on weak spots, or pivot approach."),
        ],
    }

    for day in range(1, 8):
        existing = tasks_per_day[day]
        needed = max(0, 2 - len(existing))  # Ensure at least 2 tasks per day

        if needed > 0:
            fallback_tasks = fallbacks_by_day.get(day, [])
            existing_titles = {t["title"].lower() for t in existing}

            for title, description in fallback_tasks:
                if needed <= 0:
                    break
                if title.lower() not in existing_titles:
                    task = {
                        "day_number": day,
                        "title": title,
                        "description": description,
                        "priority": len(existing) + 1,
                    }
                    tasks.append(task)
                    needed -= 1

    tasks.sort(key=lambda t: (t["day_number"], t["priority"]))
    return tasks


def _normalize_kpis(raw_kpis: list | None) -> list[str]:
    kpis: list[str] = []
    if isinstance(raw_kpis, list):
        for item in raw_kpis:
            text = str(item).strip()
            if text:
                kpis.append(text)
    if len(kpis) >= 3:
        return kpis[:6]
    return [
        "Email open rate",
        "Email click-through rate",
        "Landing-to-signup conversion rate",
        "Cost per qualified lead",
    ]


def _normalize_assets(raw_assets: list | None, requested_types: list[str], count: int) -> list[dict]:
    allowed = set(requested_types)
    limit = max(1, min(5, count)) * max(1, len(requested_types))
    assets: list[dict] = []
    if isinstance(raw_assets, list):
        for item in raw_assets:
            if not isinstance(item, dict):
                continue
            asset_type = str(item.get("asset_type") or "").strip()
            if not asset_type:
                continue
            if allowed and asset_type not in allowed:
                continue
            title = str(item.get("title") or "").strip() or asset_type.replace("_", " ").title()
            content = item.get("content")
            if not isinstance(content, dict):
                content = {"body": str(content or "").strip()}
            assets.append({"asset_type": asset_type, "title": title, "content": content})
            if len(assets) >= limit:
                break
    return assets


def _normalize_drafts(raw_drafts: list | None, context: dict, max_contacts: int) -> list[dict]:
    valid_contact_ids = {str(c.get("id")) for c in (context.get("contacts") or []) if c.get("id")}
    drafts: list[dict] = []
    if isinstance(raw_drafts, list):
        for item in raw_drafts:
            if not isinstance(item, dict):
                continue
            contact_id = str(item.get("contact_id") or "").strip()
            if not contact_id or contact_id not in valid_contact_ids:
                continue
            body = str(item.get("body") or "").strip()
            if not body:
                continue
            subject = str(item.get("subject") or "").strip() or "Quick idea for your launch"
            drafts.append({"contact_id": contact_id, "subject": subject, "body": body})
            if len(drafts) >= max(1, max_contacts):
                break
    return drafts


def run_execution_plan_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    # Combine execution prompt with plan generation guidance
    combined_prompt = EXECUTION_PROMPT + "\n\n" + PLAN_GENERATION_PROMPT

    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="execution",
        system_prompt=combined_prompt,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            "Generate a comprehensive 7-day launch plan. "
            "CRITICAL: Each day MUST have 2-3 specific, actionable tasks minimum. "
            "Tasks should be completable in 1-4 hours each with clear deliverables. "
            "Include detailed descriptions so anyone could execute them. "
            "Return launch_strategy, tasks array (with multiple tasks per day), and kpis."
        ),
    )
    normalized = {
        "launch_strategy": _normalize_launch_strategy(response.get("launch_strategy"), context),
        "tasks": _normalize_tasks(response.get("tasks"), context),
        "kpis": _normalize_kpis(response.get("kpis")),
        "chat_message": response.get("chat_message") or "",
        "next_step_suggestion": response.get("next_step_suggestion") or "",
        "should_move_to_next_stage": bool(response.get("should_move_to_next_stage")),
        "next_stage": response.get("next_stage") or "execution",
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
            f"Generate only assets. asset_types={asset_types}, count_per_type={count}. "
            "Return JSON with an assets array. "
            "Do not generate placeholder copy; each asset must be immediately publishable."
        ),
    )
    assets = _normalize_assets(response.get("assets"), asset_types, count)
    normalized = {
        "assets": assets,
        "chat_message": response.get("chat_message") or "",
        "next_step_suggestion": response.get("next_step_suggestion") or "",
        "should_move_to_next_stage": bool(response.get("should_move_to_next_stage")),
        "next_stage": response.get("next_stage") or "execution",
    }
    return normalized, {
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
    normalized_drafts = _normalize_drafts(drafts, context, max_contacts)
    normalized = {
        "drafts": normalized_drafts,
        "chat_message": response.get("chat_message") or "",
        "next_step_suggestion": response.get("next_step_suggestion") or "",
        "should_move_to_next_stage": bool(response.get("should_move_to_next_stage")),
        "next_stage": response.get("next_stage") or "execution",
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }


def run_image_ad_prompt_agent(
    context: dict,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    def _build_fallback_prompt(project_context: dict) -> str:
        project = project_context.get("project") or {}
        brief = project_context.get("brief") or {}
        research = project_context.get("research") or {}
        positioning_versions = project_context.get("positioning_versions") or []
        selected_positioning = next((p for p in positioning_versions if p.get("selected")), None) or (
            positioning_versions[0] if positioning_versions else {}
        )
        pains = research.get("pain_points") or []
        wedges = research.get("wedges") or []

        project_name = project.get("name") or "the product"
        audience = brief.get("audience") or selected_positioning.get("icp") or "the core target users"
        problem = brief.get("problem") or "a clear recurring user pain point"
        wedge = selected_positioning.get("wedge") or (wedges[0].get("label") if wedges else "a differentiated positioning wedge")
        headline = selected_positioning.get("headline") or f"{project_name}: {wedge}"
        primary_pain = pains[0].get("label") if pains else "friction in the current workflow"

        return (
            f"Create a premium, conversion-focused digital advertisement image for {project_name}. "
            f"Audience: {audience}. Core problem: {problem}. Primary pain: {primary_pain}. Differentiation wedge: {wedge}. "
            "Art direction: modern startup campaign aesthetic, clean but emotionally resonant, high contrast focal hierarchy, "
            "single clear hero subject representing the target user in an authentic environment where the pain is visible and the outcome is aspirational. "
            "Composition: rule-of-thirds, strong foreground-midground separation, directional leading lines toward the hero and value moment, "
            "ample negative space for optional headline lockup. Camera/style: photorealistic commercial photography look, 35mm lens feel, "
            "shallow depth of field, crisp detail on face/hands/product interaction, subtle filmic grain, realistic skin and materials, "
            "natural posture and believable expressions. Lighting: cinematic key light with soft fill and controlled rim light, "
            "golden-hour warmth blended with cool practicals for depth. Color palette: brand-safe modern palette with confident contrast "
            "(teal/blue accents against warm neutrals), avoid muddy tones. "
            f"Optional overlay copy reference (do not render literal text unless requested): headline '{headline}'. "
            "Output requirements: one hero ad visual, no collage, no watermark, no logo distortion, no gibberish text, no uncanny anatomy, "
            "no extra limbs/fingers, no low-res artifacts, no oversaturation. Render at ultra-high detail, ad-ready quality."
        )

    def _looks_low_quality(prompt_text: str) -> bool:
        stripped = (prompt_text or "").strip()
        if len(stripped) < 280:
            return True
        low_signal_markers = [
            "based on the github repositories",
            "provide the project's core problem statement",
            "what's the primary user pain point",
        ]
        lowered = stripped.lower()
        return any(marker in lowered for marker in low_signal_markers)

    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="execution",
        system_prompt=EXECUTION_PROMPT,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            "Generate exactly one comprehensive, high-quality image generation prompt from the full project context. "
            "Return JSON with keys: title, generation_prompt. "
            "generation_prompt must be detailed enough to produce a strong image in ChatGPT or Gemini image generation. "
            "Quality requirements for generation_prompt: "
            "1) include explicit target audience + pain point + outcome, "
            "2) include art direction, composition, camera/lens feel, lighting, color palette, and realism constraints, "
            "3) include ad-performance constraints (single clear focal subject and conversion intent), "
            "4) include negative constraints (no watermark, no gibberish text, no distorted anatomy), "
            "5) output as one polished prompt paragraph, not bullets."
        ),
    )
    generation_prompt = response.get("generation_prompt") or ""
    if _looks_low_quality(generation_prompt):
        generation_prompt = _build_fallback_prompt(context)

    normalized = {
        "title": response.get("title") or "Image Ad Draft",
        "generation_prompt": generation_prompt,
        "chat_message": response.get("chat_message") or "",
        "next_step_suggestion": response.get("next_step_suggestion") or "",
    }
    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }


def _normalize_distribution_assets(raw_assets: list | None, context: dict) -> list[dict]:
    """Normalize distribution assets with multiple variations per channel."""
    assets: list[dict] = []
    valid_types = {"cold_dm", "cold_email", "image_ad_prompt", "video_script"}
    valid_channels = {"twitter", "linkedin", "instagram", "email", "tiktok", "instagram_reels", "youtube_shorts"}

    if not isinstance(raw_assets, list):
        return assets

    for item in raw_assets:
        if not isinstance(item, dict):
            continue

        asset_type = str(item.get("asset_type") or "").strip().lower()
        if asset_type not in valid_types:
            continue

        channel = str(item.get("channel") or "").strip().lower()
        if channel and channel not in valid_channels:
            channel = ""

        variation = str(item.get("variation_label") or "A").strip().upper()
        hook_angle = str(item.get("hook_angle") or "").strip()
        title = str(item.get("title") or "").strip() or f"{asset_type.replace('_', ' ').title()} - Variation {variation}"

        content = item.get("content")
        if not isinstance(content, dict):
            content = {}

        # Ensure content has required fields based on asset_type
        if asset_type == "cold_dm" and not content.get("message"):
            continue
        if asset_type == "cold_email" and not content.get("body"):
            continue
        if asset_type == "image_ad_prompt" and not content.get("generation_prompt"):
            continue
        if asset_type == "video_script" and not content.get("script"):
            continue

        assets.append({
            "asset_type": asset_type,
            "channel": channel,
            "variation_label": variation,
            "hook_angle": hook_angle,
            "title": title,
            "content": content,
        })

    return assets


def run_distribution_assets_agent(
    context: dict,
    channels: list[str] | None = None,
    variations_per_channel: int = 3,
    *,
    backboard: BackboardStageService,
    project_id: str,
    advice: str | None = None,
    mode: str = "baseline",
) -> tuple[dict, dict]:
    """Generate multiple distribution asset variations using dedicated writing subagent."""

    # Determine which channels to generate for
    channel_list = channels or ["cold_email", "cold_dm", "image_ad_prompt", "video_script"]
    channel_str = ", ".join(channel_list)

    # Build context-aware instructions
    brief = context.get("brief") or {}
    research = context.get("research") or {}
    positioning_versions = context.get("positioning_versions") or []
    selected_positioning = next((p for p in positioning_versions if p.get("selected")), None) or (
        positioning_versions[0] if positioning_versions else {}
    )

    audience = brief.get("audience") or selected_positioning.get("icp") or "target users"
    problem = brief.get("problem") or "their core pain point"
    wedge = selected_positioning.get("wedge") or "unique differentiation"
    headline = selected_positioning.get("headline") or ""
    pains = research.get("pain_points") or []
    pain_list = ", ".join([p.get("label", "") for p in pains[:3]]) if pains else problem

    # Combine writing agent examples with distribution prompt for best results
    combined_prompt = WRITING_AGENT_SYSTEM_PROMPT + "\n\n" + DISTRIBUTION_ASSETS_PROMPT

    response, trace = backboard.run_json_stage(
        project_id=project_id,
        project_name=context.get("project", {}).get("name") or "project",
        stage="execution",
        system_prompt=combined_prompt,
        context=context,
        advice=advice,
        mode=mode,
        extra_task_instructions=(
            f"Generate {variations_per_channel} variations for each of these channels: {channel_str}. "
            f"Target audience: {audience}. "
            f"Key pain points to address: {pain_list}. "
            f"Positioning wedge: {wedge}. "
            f"Headline to reference: {headline}. "
            "IMPORTANT: Use the examples in your system prompt as templates for quality. "
            "Each variation MUST test a DIFFERENT angle, hook, or psychological approach. "
            "Write like a human who actually uses the product - never corporate, never generic. "
            "Every piece needs a clear, low-friction call to action. "
            "Return the assets array with all variations."
        ),
    )

    assets = _normalize_distribution_assets(response.get("assets"), context)

    # Build fallback assets if agent didn't produce enough
    project_name = _project_name(context)
    if len(assets) < len(channel_list):
        fallback_assets = _build_fallback_distribution_assets(context, channel_list, variations_per_channel)
        existing_types = {(a["asset_type"], a.get("variation_label", "A")) for a in assets}
        for fb in fallback_assets:
            key = (fb["asset_type"], fb.get("variation_label", "A"))
            if key not in existing_types:
                assets.append(fb)

    normalized = {
        "recommended_channels": response.get("recommended_channels") or channel_list,
        "channel_reasoning": response.get("channel_reasoning") or "",
        "assets": assets,
        "testing_strategy": response.get("testing_strategy") or "Test each variation with equal traffic splits for 48 hours, then double down on winners.",
        "chat_message": response.get("chat_message") or f"Generated {len(assets)} distribution asset variations.",
        "next_step_suggestion": response.get("next_step_suggestion") or "Review the variations and pick your favorites to start testing.",
    }

    return normalized, {
        "provider": trace.provider,
        "mode": trace.mode,
        "used_advice": trace.used_advice,
        "assistant_id": trace.assistant_id,
        "thread_id": trace.thread_id,
    }


def _build_fallback_distribution_assets(context: dict, channels: list[str], variations: int) -> list[dict]:
    """Build fallback distribution assets when agent fails to produce quality output."""
    project = context.get("project") or {}
    brief = context.get("brief") or {}
    research = context.get("research") or {}
    positioning_versions = context.get("positioning_versions") or []
    selected = next((p for p in positioning_versions if p.get("selected")), None) or (
        positioning_versions[0] if positioning_versions else {}
    )

    project_name = project.get("name") or "our product"
    audience = brief.get("audience") or selected.get("icp") or "busy professionals"
    problem = brief.get("problem") or "wasting time on manual tasks"
    wedge = selected.get("wedge") or "simple and fast"
    headline = selected.get("headline") or f"{project_name}: {wedge}"
    pains = research.get("pain_points") or []
    primary_pain = pains[0].get("label") if pains else problem

    assets = []

    if "cold_email" in channels:
        email_variations = [
            {
                "variation_label": "A",
                "hook_angle": "Curiosity + Specific Pain",
                "title": "Cold Email - Pain Point Lead",
                "content": {
                    "subject": f"quick question about {primary_pain[:30]}",
                    "preview_text": f"noticed you're dealing with this too",
                    "body": f"Been seeing a lot of {audience} mention {primary_pain} lately.\n\nWe built something that fixes this in about 5 minutes - curious if that's even on your radar right now?\n\nNo pitch, just genuinely wondering if this is still a problem worth solving.",
                    "cta": "Worth a quick look?",
                    "follow_up_1": f"Hey - circling back on this. Still curious if {primary_pain} is something you're actively trying to solve.\n\nHappy to share what's been working for others in your space.",
                    "follow_up_2": f"Last try on this - if {primary_pain} isn't a priority right now, totally get it. Just let me know and I'll stop bugging you."
                }
            },
            {
                "variation_label": "B",
                "hook_angle": "Social Proof + FOMO",
                "title": "Cold Email - Social Proof Lead",
                "content": {
                    "subject": f"how [similar company] fixed {primary_pain[:20]}",
                    "preview_text": "thought you might find this useful",
                    "body": f"Just helped another {audience} cut their {primary_pain} time by 80%.\n\nThey were skeptical too - but the results were hard to argue with.\n\nWant me to share what we did differently?",
                    "cta": "Interested?",
                    "follow_up_1": f"Quick follow-up - the approach I mentioned has been working really well for teams dealing with {primary_pain}.\n\nHappy to walk through it if useful.",
                    "follow_up_2": "Closing the loop - if this isn't relevant right now, no worries at all. Just wanted to make sure you had the option."
                }
            },
            {
                "variation_label": "C",
                "hook_angle": "Contrarian + Pattern Interrupt",
                "title": "Cold Email - Contrarian Lead",
                "content": {
                    "subject": f"unpopular opinion about {primary_pain[:25]}",
                    "preview_text": "most people get this wrong",
                    "body": f"Most {audience} try to solve {primary_pain} by throwing more tools at it.\n\nThat's backwards.\n\nWe found the real fix is actually simpler - and it takes about 5 minutes.\n\nWant to see what I mean?",
                    "cta": "Curious?",
                    "follow_up_1": f"Hey - that contrarian take on {primary_pain} I mentioned? Turns out it's working better than expected.\n\nHappy to share the details if you're curious.",
                    "follow_up_2": "Last note on this - if you're solving this differently now, I'd actually love to hear what's working. Always learning."
                }
            }
        ]
        for ev in email_variations[:variations]:
            ev["asset_type"] = "cold_email"
            ev["channel"] = "email"
            assets.append(ev)

    if "cold_dm" in channels:
        dm_variations = [
            {
                "variation_label": "A",
                "hook_angle": "Genuine Curiosity",
                "title": "Cold DM - Curiosity Opener",
                "content": {
                    "platform": "twitter",
                    "message": f"Your take on [specific thing they posted] was interesting - especially re: {primary_pain}. Quick q: is that still the main blocker you're seeing?",
                    "follow_up": f"Hey - no reply needed if you're slammed. Was genuinely curious about the {primary_pain} thing. Seeing it come up a lot lately.",
                    "reply_handling": "If they engage: share one specific insight. If objection: acknowledge and ask what IS working for them."
                }
            },
            {
                "variation_label": "B",
                "hook_angle": "Value-First",
                "title": "Cold DM - Value Lead",
                "content": {
                    "platform": "linkedin",
                    "message": f"Found this while researching {primary_pain} solutions - thought of you based on your recent post. No pitch, just thought it might be useful: [specific insight or resource]",
                    "follow_up": "Hey - hope that was helpful. If you're actively working on this, happy to share a few more things that have been working.",
                    "reply_handling": "If interested: offer a quick call or async exchange. If not interested: thank them and move on gracefully."
                }
            },
            {
                "variation_label": "C",
                "hook_angle": "Mutual Connection",
                "title": "Cold DM - Connection Lead",
                "content": {
                    "platform": "twitter",
                    "message": f"We're both connected with [mutual]. They mentioned you're one of the sharper people thinking about {primary_pain}. Curious what you're trying right now.",
                    "follow_up": "No worries if you're too busy - just wanted to connect with someone who's actually in the weeds on this stuff.",
                    "reply_handling": "Keep it conversational. Share experiences, not pitches. Build relationship before any ask."
                }
            }
        ]
        for dv in dm_variations[:variations]:
            dv["asset_type"] = "cold_dm"
            dv["channel"] = dv["content"].get("platform", "twitter")
            assets.append(dv)

    if "image_ad_prompt" in channels:
        image_variations = [
            {
                "variation_label": "A",
                "hook_angle": "Before/After Transformation",
                "title": "Image Ad - Transformation Visual",
                "content": {
                    "generation_prompt": f"Professional commercial photography of a {audience} at their workspace, looking relieved and confident after solving a frustrating problem. Clean modern office environment with natural lighting. The subject is leaning back in their chair with a subtle smile, laptop open showing a clean dashboard. Warm golden hour light from a window, shallow depth of field, photorealistic style, 35mm lens perspective. No text overlays, no logos, focus on authentic human emotion of accomplishment. High detail, commercial ad quality.",
                    "visual_concept": "Relief and confidence after the transformation",
                    "target_emotion": "Relief, accomplishment, confidence",
                    "headline_overlay": headline,
                    "cta_overlay": "See how it works"
                }
            },
            {
                "variation_label": "B",
                "hook_angle": "Pain Point Visualization",
                "title": "Image Ad - Frustration Moment",
                "content": {
                    "generation_prompt": f"Cinematic photograph of a {audience} experiencing a moment of frustration at their desk, hands on temples, multiple browser tabs and papers visible but blurred. Dramatic side lighting creating contrast, conveying the weight of {primary_pain}. Modern workspace, muted color palette with subtle teal accents. Photorealistic style, shallow depth of field, editorial quality. The composition leaves space on the right for text overlay. No visible text in image, authentic human expression, commercial photography aesthetic.",
                    "visual_concept": "The painful moment before the solution",
                    "target_emotion": "Recognition, empathy, frustration",
                    "headline_overlay": f"Tired of {primary_pain}?",
                    "cta_overlay": "There's a better way"
                }
            },
            {
                "variation_label": "C",
                "hook_angle": "Aspirational Outcome",
                "title": "Image Ad - Success State",
                "content": {
                    "generation_prompt": f"High-end lifestyle photography showing a successful {audience} in an aspirational moment - perhaps closing a laptop with satisfaction, or in a casual meeting where they're clearly the expert. Bright, optimistic lighting, clean modern environment, subject dressed professionally but relaxed. Natural pose, genuine smile, conveying mastery and ease. Premium commercial aesthetic, rule of thirds composition, soft background bokeh. No text, no logos, focus on the feeling of having solved {primary_pain}. Ultra high detail, magazine ad quality.",
                    "visual_concept": "Life after the problem is solved",
                    "target_emotion": "Aspiration, success, ease",
                    "headline_overlay": headline,
                    "cta_overlay": "Join them"
                }
            }
        ]
        for iv in image_variations[:variations]:
            iv["asset_type"] = "image_ad_prompt"
            iv["channel"] = "instagram"
            assets.append(iv)

    if "video_script" in channels:
        video_variations = [
            {
                "variation_label": "A",
                "hook_angle": "Problem Agitation",
                "title": "Video Script - POV Problem",
                "content": {
                    "platform": "tiktok",
                    "duration": "30s",
                    "hook": "[Camera on face, frustrated expression] POV: You've wasted another 2 hours on {primary_pain}",
                    "script": """[0-2s] POV: You've wasted another 2 hours on [pain point]
[2-8s] [show common struggle - messy tabs, confusing spreadsheets]
"Every day it's the same thing..."
[8-15s] [lean in, conspiratorial]
"But here's what nobody tells you - there's literally a way to do this in 5 minutes"
[15-25s] [quick demo or visual proof]
"I switched last week and honestly? I'm mad I didn't do it sooner."
[25-30s] [back to face, genuine]
"Link in bio if you want to stop wasting time on this."
""",
                    "text_overlays": [f"POV: {primary_pain} is ruining your day", "there's a better way", "5 minutes instead of 2 hours", "link in bio"],
                    "cta": "Link in bio - thank me later",
                    "music_mood": "Trending sound, slightly frustrated energy transitioning to hopeful"
                }
            },
            {
                "variation_label": "B",
                "hook_angle": "Tutorial/Value",
                "title": "Video Script - Quick Tutorial",
                "content": {
                    "platform": "instagram_reels",
                    "duration": "45s",
                    "hook": "[Screen recording starting] Stop doing [pain point] the hard way",
                    "script": """[0-3s] [Text on screen] "Stop doing [pain] the hard way"
[3-10s] "Okay so everyone's been asking how I [solve pain point] so fast"
[10-25s] [Screen recording with cursor movements]
"Step 1: [action] - takes like 10 seconds"
"Step 2: [action] - this is the magic part"
"Step 3: [action] - and done"
[25-40s] [Back to face]
"That's literally it. No more [pain point]."
[40-45s] "Save this and try it - you'll thank me later."
""",
                    "text_overlays": ["How I do this in 5 min", "Step 1", "Step 2", "Step 3", "save this"],
                    "cta": "Save this and follow for more",
                    "music_mood": "Upbeat, tutorial-style, trending but not distracting"
                }
            },
            {
                "variation_label": "C",
                "hook_angle": "Story/Testimonial",
                "title": "Video Script - Personal Story",
                "content": {
                    "platform": "tiktok",
                    "duration": "60s",
                    "hook": "[Sitting casually] I almost quit because of [pain point]",
                    "script": """[0-3s] "I almost quit because of [pain point]"
[3-15s] [Storytime vibe]
"Last month I was spending like 3 hours a day on [task]. It was killing me."
"My partner was like 'why are you still at your computer?' - I had no good answer."
[15-30s] [Shift in energy]
"Then someone showed me this thing and I thought they were lying."
"Like there's no way it's this simple."
[30-50s] [Proof/Demo]
"But look - [show result]. Same thing that took me 3 hours."
"I literally got that time back in my life."
[50-60s] [Genuine closing]
"If you're dealing with this too, just... go look at this. Changed everything for me."
""",
                    "text_overlays": ["storytime", "I almost quit", "this changed everything", "link in bio"],
                    "cta": "Link in bio - this changed my life",
                    "music_mood": "Emotional, storytelling vibe, soft background"
                }
            }
        ]
        for vv in video_variations[:variations]:
            vv["asset_type"] = "video_script"
            vv["channel"] = vv["content"].get("platform", "tiktok")
            # Replace placeholder text with actual context
            script = vv["content"]["script"]
            script = script.replace("[pain point]", primary_pain[:30])
            script = script.replace("[pain]", primary_pain[:20])
            script = script.replace("[task]", primary_pain[:25])
            vv["content"]["script"] = script
            vv["content"]["hook"] = vv["content"]["hook"].replace("[pain point]", primary_pain[:30])
            assets.append(vv)

    return assets
