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

def _put_attribute(base, auth, customer_id, attribute, value):
    """Helper: PUT un attribut sur un customer. Log les erreurs, ne raise jamais."""
    try:
        requests.put(
            f"{base}/customer/{customer_id}",
            data={"customers_attribute": attribute, "new_value": value},
            auth=auth, timeout=10,
        )
    except Exception as e:
        logger.warning(f"Hiboutik PUT {attribute} failed for {customer_id}: {e}")


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

    base = f"https://{HIBOUTIK_ACCOUNT}.hiboutik.com/api"
    auth = (HIBOUTIK_EMAIL, HIBOUTIK_API_KEY)

    first_name = (first_name or "").strip()
    last_name = (last_name or "").strip()
    email_clean = (email or "").strip()
    phone_clean = (phone or "").strip()

    # 1. Anti-doublon : lookup par email
    if email_clean:
        try:
            resp = requests.get(
                f"{base}/customers/search",
                params={"email": email_clean},
                auth=auth, timeout=10,
            )
            if resp.status_code == 200:
                items = resp.json()
                if isinstance(items, list) and items:
                    # Match exact email (case-insensitive) pour éviter les faux positifs substring
                    existing = next(
                        (c for c in items if (c.get("email") or "").lower() == email_clean.lower()),
                        None,
                    )
                    if existing:
                        customer_id = existing["customers_id"]
                        logger.info(
                            f"Hiboutik customer EXISTS (email match): id={customer_id} — updating empty fields only"
                        )
                        # Update UNIQUEMENT les champs vides côté Hiboutik (jamais d'écrasement)
                        if first_name and not (existing.get("first_name") or "").strip():
                            _put_attribute(base, auth, customer_id, "first_name", first_name)
                        if last_name and not (existing.get("last_name") or "").strip():
                            _put_attribute(base, auth, customer_id, "last_name", last_name)
                        if phone_clean and not (existing.get("phone") or "").strip():
                            _put_attribute(base, auth, customer_id, "phone", phone_clean)
                        if code and not (existing.get("customers_misc") or "").strip():
                            _put_attribute(base, auth, customer_id, "customers_misc", code)
                        return {"customers_id": customer_id}
        except Exception as e:
            logger.warning(f"Hiboutik email lookup failed (will create new): {e}")

    # 2. Pas trouvé (ou pas d'email) → POST création
    create_payload = {
        "customers_first_name": first_name,
        "customers_last_name": last_name,
        "customers_country": "FRA",
    }
    if email_clean:
        create_payload["customers_email"] = email_clean

    resp = requests.post(f"{base}/customers", data=create_payload, auth=auth, timeout=15)
    if resp.status_code >= 300:
        logger.error(f"Hiboutik POST /customers failed: {resp.status_code} {resp.text[:200]}")
        return None
    try:
        new_id = resp.json().get("customers_id")
    except Exception:
        logger.error(f"Hiboutik POST /customers: non-JSON response: {resp.text[:200]}")
        return None
    if not new_id:
        return None

    # 3. PUT phone + misc (ignorés au POST par Hiboutik)
    if phone_clean:
        _put_attribute(base, auth, new_id, "phone", phone_clean)
    if code:
        _put_attribute(base, auth, new_id, "customers_misc", code)

    return {"customers_id": new_id}

async def sync_lead_to_hiboutik(
    name: Optional[str] = None,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    code: str = "online",
) -> Optional[int]:
    """Crée un client Hiboutik depuis un lead. Non-bloquant, ne raise jamais.
    Retourne le customers_id Hiboutik, ou None en cas d'échec.
    """
    try:
        if not first_name and not last_name and name:
            first_name, last_name = _split_name(name)
        if not first_name and not last_name:
            logger.warning("Hiboutik sync skipped: no name provided")
            return None

        result = await asyncio.to_thread(
            _create_customer_blocking, first_name, last_name, email, phone, code,
        )
        if result and result.get("customers_id"):
            customer_id = result["customers_id"]
            logger.info(
                f"Hiboutik customer created: id={customer_id} "
                f"({first_name} {last_name} · {code})"
            )
            return customer_id
        return None
    except Exception as e:
        logger.error(f"Hiboutik sync error (non-fatal): {e}")
        return None
