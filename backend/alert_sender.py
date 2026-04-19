"""
FCM push notification sender using the HTTP v1 API (legacy server key deprecated June 2024).

Auth: google.auth.default() — uses workload identity when running on Cloud Run,
falls back to GOOGLE_APPLICATION_CREDENTIALS file for local dev.
Token is cached in-process and refreshed automatically when it expires (~1 hour).
"""
import asyncio
from typing import Optional

import google.auth
import google.auth.transport.requests
import httpx

from config import GCP_PROJECT_ID

_FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging"

_credentials: Optional[google.auth.credentials.Credentials] = None


def _load_credentials() -> Optional[google.auth.credentials.Credentials]:
    try:
        credentials, _ = google.auth.default(scopes=[_FCM_SCOPE])
        return credentials
    except google.auth.exceptions.DefaultCredentialsError:
        return None


def _get_valid_token() -> Optional[str]:
    """Refresh credentials if needed and return a valid access token (sync)."""
    global _credentials
    if _credentials is None:
        _credentials = _load_credentials()
    if _credentials is None:
        return None
    if not _credentials.valid:
        _credentials.refresh(google.auth.transport.requests.Request())
    return _credentials.token


async def send_fcm_notification(fcm_token: str, title: str, body: str) -> bool:
    """
    Send a push notification via FCM HTTP v1 API.
    Returns True if FCM accepted the message, False on any failure or misconfiguration.
    """
    if not fcm_token or not GCP_PROJECT_ID:
        return False

    access_token = await asyncio.to_thread(_get_valid_token)
    if not access_token:
        return False

    url = f"https://fcm.googleapis.com/v1/projects/{GCP_PROJECT_ID}/messages:send"
    payload = {
        "message": {
            "token": fcm_token,
            "notification": {"title": title, "body": body},
            "data": {"type": "pollen_alert"},
        }
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; UTF-8",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return True
    except Exception:
        return False
