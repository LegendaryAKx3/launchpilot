from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.integrations.resend_client import ResendClient
from app.models.execution import Contact, OutboundBatch, OutboundMessage


class ExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.resend = ResendClient()

    def send_email_batch(self, project_id, batch_id) -> dict:
        batch = self.db.query(OutboundBatch).filter(OutboundBatch.id == batch_id, OutboundBatch.project_id == project_id).first()
        if not batch:
            raise ValueError("Batch not found")

        messages = self.db.query(OutboundMessage).filter(OutboundMessage.batch_id == batch.id).all()
        contact_ids = [message.contact_id for message in messages]
        contacts = self.db.query(Contact).filter(Contact.id.in_(contact_ids)).all() if contact_ids else []
        contact_by_id = {contact.id: contact for contact in contacts}

        sent_count = 0
        for message in messages:
            contact = contact_by_id.get(message.contact_id)
            to_email = contact.email if contact else None
            if not to_email:
                message.status = "failed"
                message.error_message = "Missing recipient email"
                continue

            try:
                provider_id = self.resend.send_email(to_email, message.subject or "Launch update", message.body or "")
                message.status = "sent"
                message.provider_message_id = provider_id
                message.sent_at = datetime.now(timezone.utc)
                sent_count += 1
            except Exception as exc:  # noqa: BLE001
                message.status = "failed"
                message.error_message = str(exc)

        batch.status = "sent" if sent_count > 0 else "failed"
        batch.send_count = sent_count
        batch.sent_at = datetime.now(timezone.utc)

        return {"batch_id": str(batch.id), "sent_count": sent_count, "status": batch.status}
