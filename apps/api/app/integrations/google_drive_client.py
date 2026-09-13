from __future__ import annotations

import json
from typing import Any

import httpx


class GoogleDriveClient:
    upload_url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"

    def create_text_file(
        self,
        *,
        access_token: str,
        title: str,
        content: str,
        mime_type: str = "text/plain",
        folder_id: str | None = None,
    ) -> dict[str, Any]:
        metadata: dict[str, Any] = {"name": title}
        if folder_id:
            metadata["parents"] = [folder_id]

        multipart = [
            (
                "metadata",
                (
                    "metadata",
                    json.dumps(metadata),
                    "application/json; charset=UTF-8",
                ),
            ),
            (
                "file",
                (
                    title,
                    content.encode("utf-8"),
                    mime_type,
                ),
            ),
        ]

        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                self.upload_url,
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                files=multipart,
            )
            response.raise_for_status()
            data = response.json()
            file_id = str(data.get("id") or "")
            web_view_link = f"https://drive.google.com/file/d/{file_id}/view" if file_id else None
            return {
                "id": file_id or None,
                "name": data.get("name"),
                "mimeType": data.get("mimeType"),
                "webViewLink": web_view_link,
            }
