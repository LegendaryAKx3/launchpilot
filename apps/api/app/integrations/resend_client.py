from __future__ import annotations

import logging
import uuid

import resend

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ResendClient:
    def __init__(self) -> None:
        self.settings = get_settings()
        if self.settings.resend_api_key:
            resend.api_key = self.settings.resend_api_key

    def send_email(self, to_email: str, subject: str, html_body: str) -> str:
        if not self.settings.resend_api_key:
            return f"mock-msg-{uuid.uuid4().hex[:12]}"

        try:
            response = resend.Emails.send(
                {
                    "from": self.settings.resend_from_email,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_body,
                }
            )
        except Exception as exc:
            logger.exception("Resend API call failed for %s", to_email)
            raise RuntimeError(f"Email delivery failed: {exc}") from exc

        if not isinstance(response, dict):
            logger.warning("Resend returned non-dict response: %s", type(response))
            return f"msg-{uuid.uuid4().hex[:12]}"

        return response.get("id", f"msg-{uuid.uuid4().hex[:12]}")
