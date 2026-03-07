from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.integrations.backboard_client import BackboardClient, BackboardRequestError
from app.services.memory_service import get_project_memory_value, upsert_project_memory

VALID_MODES = {"baseline", "deepen", "retry", "extend"}

MODE_GUIDANCE = {
    "baseline": "Generate a high-confidence baseline output suitable for immediate execution.",
    "deepen": "Go deeper: increase specificity, include stronger rationale, and add practical detail.",
    "retry": "Take a materially different approach than prior attempts while staying grounded in context.",
    "extend": "Extend existing work by building on earlier outputs rather than replacing everything.",
}


@dataclass(slots=True)
class BackboardRunTrace:
    provider: str
    mode: str
    used_advice: bool
    assistant_id: str | None = None
    thread_id: str | None = None
    fallback_reason: str | None = None


class BackboardStageService:
    def __init__(self, db: Session, settings: Settings | None = None):
        self.db = db
        self.settings = settings or get_settings()
        self._client: BackboardClient | None = None

    @property
    def enabled(self) -> bool:
        return bool(self.settings.backboard_api_key)

    def run_json_stage(
        self,
        *,
        project_id: str,
        project_name: str,
        stage: str,
        system_prompt: str,
        context: dict[str, Any],
        advice: str | None,
        mode: str,
        extra_task_instructions: str | None = None,
    ) -> tuple[dict[str, Any], BackboardRunTrace]:
        normalized_mode = mode if mode in VALID_MODES else "baseline"
        if not self.enabled:
            raise BackboardRequestError("BACKBOARD_API_KEY is not configured")

        assistant_id, thread_id = self._get_or_create_stage_session(
            project_id=project_id,
            project_name=project_name,
            stage=stage,
            system_prompt=system_prompt,
        )

        message = self._build_stage_message(
            mode=normalized_mode,
            context=context,
            advice=advice,
            extra_task_instructions=extra_task_instructions,
        )
        result = self.client.add_message(
            thread_id=thread_id,
            content=message,
            memory=self.settings.backboard_memory_mode,
            llm_provider=self.settings.backboard_llm_provider,
            model_name=self.settings.backboard_model_name,
        )
        text = self._extract_text_content(result)
        parsed = self._parse_json_response(text)

        upsert_project_memory(
            self.db,
            project_id,
            f"backboard_{stage}_last_output",
            {"mode": normalized_mode, "advice": advice, "output": parsed},
            "agent_output",
            "backboard",
        )

        return parsed, BackboardRunTrace(
            provider="backboard",
            mode=normalized_mode,
            used_advice=bool(advice and advice.strip()),
            assistant_id=assistant_id,
            thread_id=thread_id,
        )

    @property
    def client(self) -> BackboardClient:
        if self._client is None:
            if not self.settings.backboard_api_key:
                raise BackboardRequestError("BACKBOARD_API_KEY is not configured")
            self._client = BackboardClient(
                api_key=self.settings.backboard_api_key,
                base_url=self.settings.backboard_base_url,
            )
        return self._client

    def _get_or_create_stage_session(
        self,
        *,
        project_id: str,
        project_name: str,
        stage: str,
        system_prompt: str,
    ) -> tuple[str, str]:
        assistant_key = f"backboard_{stage}_assistant"
        thread_key = f"backboard_{stage}_thread"

        assistant_mem = get_project_memory_value(self.db, project_id, assistant_key, {})
        thread_mem = get_project_memory_value(self.db, project_id, thread_key, {})
        assistant_id = assistant_mem.get("assistant_id")
        thread_id = thread_mem.get("thread_id")

        if not assistant_id:
            assistant_name = f"{project_name or 'project'}-{stage}-agent"
            assistant_id = self.client.create_assistant(name=assistant_name, system_prompt=system_prompt)
            upsert_project_memory(
                self.db,
                project_id,
                assistant_key,
                {"assistant_id": assistant_id},
                "integration_ref",
                "backboard",
            )

        if not thread_id:
            thread_id = self.client.create_thread(assistant_id)
            upsert_project_memory(
                self.db,
                project_id,
                thread_key,
                {"thread_id": thread_id},
                "integration_ref",
                "backboard",
            )

        return assistant_id, thread_id

    def _build_stage_message(
        self,
        *,
        mode: str,
        context: dict[str, Any],
        advice: str | None,
        extra_task_instructions: str | None = None,
    ) -> str:
        advice_text = advice.strip() if advice else "None provided."
        parts = [
            f"Mode: {mode}",
            f"Mode guidance: {MODE_GUIDANCE.get(mode, MODE_GUIDANCE['baseline'])}",
            "User guidance:",
            advice_text,
        ]
        if extra_task_instructions:
            parts.extend(["Task extension:", extra_task_instructions.strip()])
        parts.extend(
            [
                "Project context JSON:",
                json.dumps(context, ensure_ascii=True),
                "Return valid JSON only. Do not include markdown fences.",
            ]
        )
        return "\n\n".join(parts)

    def _extract_text_content(self, result: dict[str, Any]) -> str:
        content = result.get("content")
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            chunks: list[str] = []
            for item in content:
                if isinstance(item, str):
                    chunks.append(item)
                elif isinstance(item, dict):
                    text = item.get("text") or item.get("content")
                    if isinstance(text, str):
                        chunks.append(text)
            return "\n".join(chunks).strip()
        return json.dumps(result, ensure_ascii=True)

    def _parse_json_response(self, content: str) -> dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
            cleaned = re.sub(r"```$", "", cleaned).strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            parsed = None

        if isinstance(parsed, dict):
            return parsed

        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise BackboardRequestError("Backboard response did not contain JSON object content")

        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            raise BackboardRequestError("Backboard response contained invalid JSON") from exc

        if not isinstance(parsed, dict):
            raise BackboardRequestError("Backboard JSON response was not an object")
        return parsed
