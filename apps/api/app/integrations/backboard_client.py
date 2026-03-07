from __future__ import annotations

from dataclasses import dataclass

import httpx


class BackboardRequestError(RuntimeError):
    pass


@dataclass(slots=True)
class BackboardClient:
    api_key: str
    base_url: str = "https://app.backboard.io/api"
    timeout_seconds: float = 60.0

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key}

    def _url(self, path: str) -> str:
        return f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"

    def create_assistant(self, name: str, system_prompt: str) -> str:
        payload = {"name": name, "system_prompt": system_prompt}
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(self._url("/assistants"), json=payload, headers=self._headers())
        data = self._parse_response(response, "create assistant")
        assistant_id = data.get("assistant_id")
        if not assistant_id:
            raise BackboardRequestError("Backboard create assistant response missing assistant_id")
        return assistant_id

    def create_thread(self, assistant_id: str) -> str:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                self._url(f"/assistants/{assistant_id}/threads"),
                headers=self._headers(),
            )
        data = self._parse_response(response, "create thread")
        thread_id = data.get("thread_id")
        if not thread_id:
            raise BackboardRequestError("Backboard create thread response missing thread_id")
        return thread_id

    def add_message(
        self,
        thread_id: str,
        content: str,
        *,
        memory: str = "Auto",
        llm_provider: str = "openai",
        model_name: str = "gpt-4o",
    ) -> dict:
        payload = {
            "content": content,
            "stream": "false",
            "memory": memory,
            "llm_provider": llm_provider,
            "model_name": model_name,
        }
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                self._url(f"/threads/{thread_id}/messages"),
                headers=self._headers(),
                data=payload,
            )
        return self._parse_response(response, "add message")

    def get_thread(self, thread_id: str) -> dict:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                self._url(f"/threads/{thread_id}"),
                headers=self._headers(),
            )
        return self._parse_response(response, "get thread")

    def add_memory(self, assistant_id: str, content: str) -> dict:
        payload = {"content": content}
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.post(
                self._url(f"/assistants/{assistant_id}/memories"),
                headers=self._headers(),
                json=payload,
            )
        return self._parse_response(response, "add memory")

    def list_memories(self, assistant_id: str) -> dict:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                self._url(f"/assistants/{assistant_id}/memories"),
                headers=self._headers(),
            )
        return self._parse_response(response, "list memories")

    def get_memory_stats(self, assistant_id: str) -> dict:
        with httpx.Client(timeout=self.timeout_seconds) as client:
            response = client.get(
                self._url(f"/assistants/{assistant_id}/memories/stats"),
                headers=self._headers(),
            )
        return self._parse_response(response, "get memory stats")

    def _parse_response(self, response: httpx.Response, action: str) -> dict:
        if response.is_error:
            message = response.text.strip() or response.reason_phrase
            raise BackboardRequestError(f"Backboard {action} failed ({response.status_code}): {message}")
        try:
            data = response.json()
        except ValueError as exc:
            raise BackboardRequestError(f"Backboard {action} returned non-JSON response") from exc
        if not isinstance(data, dict):
            raise BackboardRequestError(f"Backboard {action} returned unexpected response shape")
        return data
