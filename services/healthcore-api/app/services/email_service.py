"""Best-effort email notifications through the Resend HTTP API."""

import html
import json
import logging
import os
from typing import Literal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

EmailEvent = Literal["registered", "login", "password_reset"]


def send_auth_notification(recipient: str, event: EmailEvent, reset_url: str | None = None) -> None:
    """Send an account-created or successful-login notification via Resend.

    Delivery is best effort: missing configuration or provider/network errors are
    logged but never propagated to the API request.
    """
    api_key = os.getenv("RESEND_API_KEY")
    from_email = os.getenv("RESEND_FROM_EMAIL")
    if not api_key or not from_email:
        logger.warning("Resend notification skipped: RESEND_API_KEY/RESEND_FROM_EMAIL not configured")
        return

    if event == "registered":
        subject = "Your HealthCore account was created"
        text = "Your HealthCore account was created successfully."
    elif event == "login":
        subject = "New sign-in to your HealthCore account"
        text = "A successful sign-in to your HealthCore account was detected."
    else:
        if not reset_url:
            logger.warning("Password reset email skipped: reset URL is missing")
            return
        subject = "Reset your HealthCore password"
        text = f"Use this link to reset your HealthCore password: {reset_url}\n\nThis link expires shortly and can only be used once."

    safe_text = html.escape(text)
    if event == "password_reset" and reset_url:
        safe_url = html.escape(reset_url, quote=True)
        html_body = (
            "<p>Use the link below to reset your HealthCore password. "
            "This link expires shortly and can only be used once.</p>"
            f'<p><a href="{safe_url}">Reset password</a></p>'
        )
    else:
        html_body = f"<p>{safe_text.replace(chr(10), '<br>')}</p>"
    payload = json.dumps(
        {
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "text": text,
            "html": html_body,
        }
    ).encode("utf-8")
    request = Request(
        "https://api.resend.com/emails",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "HealthCore-API/0.1 Resend-Notifications",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=5) as response:
            if not 200 <= response.status < 300:
                logger.warning("Resend rejected %s notification (HTTP %s)", event, response.status)
    except HTTPError as exc:
        # Resend's response explains common setup issues (invalid key, unverified
        # sender, or restricted test recipient); never log request headers/API key.
        try:
            response_detail = exc.read().decode("utf-8", errors="replace")[:1000]
        except OSError:
            response_detail = "<response body unavailable>"
        logger.warning(
            "Resend %s notification failed (HTTP %s): %s",
            event,
            exc.code,
            response_detail,
        )
    except (URLError, TimeoutError, OSError) as exc:
        logger.warning("Resend %s notification failed (%s)", event, type(exc).__name__)