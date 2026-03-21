from __future__ import annotations

from dataclasses import dataclass
import time

import httpx


class BackboardRequestError(RuntimeError):
    pass


TRANSIENT_STATUS_CODES = {429, 500, 502, 503, 504}


@dataclass(slots=True)
class BackboardClient:
    api_key: str
    base_url: str = "https://app.backboard.io/api"
    timeout_seconds: float = 60.0
    retries: int = 2

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key}

    def _url(self, path: str) -> str:
        return f"{self.base_url.rstrip('/')}/{path.lstrip('/')}"

    def create_assistant(self, name: str, system_prompt: str) -> str:
        payload = {"name": name, "system_prompt": system_prompt}
        response = self._request("POST", "/assistants", json=payload)
        data = self._parse_response(response, "create assistant")
        assistant_id = data.get("assistant_id")
        if not assistant_id:
            raise BackboardRequestError("Backboard create assistant response missing assistant_id")
        return assistant_id

    def create_thread(self, assistant_id: str) -> str:
        response = self._request("POST", f"/assistants/{assistant_id}/threads")
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
        response = self._request(
            "POST",
            f"/threads/{thread_id}/messages",
            data=payload,
            timeout=max(self.timeout_seconds, 120.0),
        )
        return self._parse_response(response, "add message")

    def get_thread(self, thread_id: str) -> dict:
        response = self._request("GET", f"/threads/{thread_id}")
        return self._parse_response(response, "get thread")

    def add_memory(self, assistant_id: str, content: str) -> dict:
        payload = {"content": content}
        response = self._request("POST", f"/assistants/{assistant_id}/memories", json=payload)
        return self._parse_response(response, "add memory")

    def list_memories(self, assistant_id: str) -> dict:
        response = self._request("GET", f"/assistants/{assistant_id}/memories")
        return self._parse_response(response, "list memories")

    def get_memory_stats(self, assistant_id: str) -> dict:
        response = self._request("GET", f"/assistants/{assistant_id}/memories/stats")
        return self._parse_response(response, "get memory stats")

    def _request(
        self,
        method: str,
        path: str,
        *,
        timeout: float | None = None,
        **kwargs,
    ) -> httpx.Response:
        request_timeout = timeout if timeout is not None else self.timeout_seconds
        last_exc: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                with httpx.Client(timeout=request_timeout) as client:
                    response = client.request(
                        method=method,
                        url=self._url(path),
                        headers=self._headers(),
                        **kwargs,
                    )
                    if response.status_code in TRANSIENT_STATUS_CODES and attempt < self.retries:
                        time.sleep(min(0.5 * (2 ** attempt), 10.0))  # exponential backoff, capped at 10s
                        continue
                    return response
            except (httpx.ReadTimeout, httpx.ConnectTimeout, httpx.NetworkError, httpx.RemoteProtocolError) as exc:
                last_exc = exc
                if attempt < self.retries:
                    time.sleep(min(0.5 * (2 ** attempt), 10.0))
                    continue
                raise BackboardRequestError(
                    f"Backboard request failed after {self.retries + 1} attempts: {exc}"
                ) from exc
        raise BackboardRequestError(f"Backboard request failed: {last_exc}")

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
