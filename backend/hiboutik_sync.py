"""Sync new website leads → Hiboutik customers.

Called as `asyncio.ensure_future(sync_lead_to_hiboutik(...))` from server.py
after each lead is inserted in MongoDB. Non-blocking, never raises:
if Hiboutik is down or misconfigured, the website continues to work normally.

Credentials come from env vars: HIBOUTIK_ACCOUNT, HIBOUTIK_EMAIL, HIBOUTIK_API_KEY.
"""
import asyncio
import logging
import os
from typing import Optional

import requests

logger = logging.getLogger(__name__)

HIBOUTIK_ACCOUNT = os.environ.get("HIBOUTIK_ACCOUNT")
HIBOUTIK_EMAIL = os.environ.get("HIBOUTIK_EMAIL")
HIBOUTIK_API_KEY = os.environ.get("HIBOUTIK_API_KEY")

def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split()
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])

def _create_customer_blocking(
    first_name: str,
    last_name: str,
    email: Optional[str],
    phone: Optional[str],
    code: str,
) -> Optional[dict]:
    if not (HIBOUTIK_ACCOUNT and HIBOUTIK_EMAIL and HIBOUTIK_API_KEY):
        logger.warning("Hiboutik sync skipped: credentials missing in env")
        return None

    url = f"https://{HIBOUTIK_ACCOUNT}.hiboutik.com/api/customers"
    payload = {
        "customers_first_name": (first_name or "").strip(),
        "customers_last_name": (last_name or "").strip(),
        "customers_country": "FRA",
        "customers_code": code,
    }
    if email:
        payload["customers_email"] = email.strip()
    if phone:
        payload["phone"] = phone.strip()  # Hiboutik POST takes 'phone' (no prefix)

    resp = requests.post(
        url, data=payload,
        auth=(HIBOUTIK_EMAIL, HIBOUTIK_API_KEY),
        timeout=15,
    )
    if resp.status_code >= 300:
        logger.error(f"Hiboutik POST /customers failed: {resp.status_code} {resp.text[:200]}")
        return None
    try:
        return resp.json()
    except Exception:
        logger.error(f"Hiboutik POST /customers: non-JSON response: {resp.text[:200]}")
        return None

async def sync_lead_to_hiboutik(
    name: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    code: str = "online",
) -> None:
    """Create a Hiboutik customer from a new lead. Non-blocking, never raises.

    Pass `name` (full name string) OR `first_name` + `last_name` separately.
    """
    try:
        if not first_name and not last_name and name:
            first_name, last_name = _split_name(name)
        if not first_name and not last_name:
            logger.warning("Hiboutik sync skipped: no name provided")
            return

        result = await asyncio.to_thread(
            _create_customer_blocking, first_name, last_name, email, phone, code,
        )
        if result and result.get("customers_id"):
            logger.info(
                f"Hiboutik customer created: id={result['customers_id']} "
                f"({first_name} {last_name} · {code})"
            )
    except Exception as e:
        # Never propagate — Hiboutik issues must NOT break a lead being saved
        logger.error(f"Hiboutik sync error (non-fatal): {e}")
