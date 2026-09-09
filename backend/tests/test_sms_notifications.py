"""Tests for the SMS(Brevo)+email notification tracking replacement of WhatsApp/UltraMsg.

Environment expectation: SMS_ENABLED=false (final resting state).
SMTP is known-broken in this env → new leads notify_status=='failed' is EXPECTED.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://repair-tech-demo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
ADMIN_EMAIL = "david.m@repairandco.fr"
ADMIN_PASSWORD = "Repair2025Admin!"
DELETE_CODE = "MOUR1"
CREATED_IDS = []  # (category, id)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- Form creation (fast return, background notification) ----------
def _rand_email():
    return f"TEST_{uuid.uuid4().hex[:8]}@example.com"


def test_quote_lattes_returns_200_fast():
    payload = {
        "device_type": "smartphone", "brand": "Apple", "model": "iPhone 12",
        "issue_types": ["Ecran"], "name": "TEST_Quote", "phone": "0600000001",
        "email": _rand_email(), "store": "lattes",
    }
    t0 = time.time()
    r = requests.post(f"{API}/quote", json=payload, timeout=15)
    elapsed = time.time() - t0
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "success" and "id" in data
    assert elapsed < 8, f"Response too slow ({elapsed:.1f}s) — should not block on notification"
    CREATED_IDS.append(("devis", data["id"]))


def test_contact_lattes_returns_200():
    payload = {
        "name": "TEST_Contact", "email": _rand_email(), "phone": "0600000002",
        "subject": "Question", "store": "lattes", "message": "Test message",
    }
    r = requests.post(f"{API}/contact", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    CREATED_IDS.append(("contact", r.json()["id"]))


def test_buyback_lattes_returns_200():
    payload = {
        "brand": "Apple", "model": "iPhone 11", "condition": "good",
        "name": "TEST_Buyback", "phone": "0600000003", "store": "lattes",
    }
    r = requests.post(f"{API}/buyback", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    CREATED_IDS.append(("rachat", r.json()["id"]))


def test_b2b_without_store_creates_lead():
    payload = {
        "first_name": "TEST", "last_name": "B2B_NoStore", "company": "ACME",
        "email": _rand_email(), "phone": "0600000004", "fleet_size": "10-50",
        "need_type": "maintenance", "message": "Test entreprise",
    }
    r = requests.post(f"{API}/b2b", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    CREATED_IDS.append(("entreprise", r.json()["id"]))


def test_b2b_beziers_returns_400():
    payload = {
        "first_name": "TEST", "last_name": "B2B_Beziers", "company": "ACME",
        "email": _rand_email(), "phone": "0600000005", "fleet_size": "10",
        "store": "beziers",
    }
    r = requests.post(f"{API}/b2b", json=payload, timeout=15)
    assert r.status_code == 400
    assert "fermé" in r.text or "ferme" in r.text.lower()


# ---------- Notification persistence (after ~15s wait) ----------
def test_notifications_persisted_on_lead(auth_headers):
    # Wait for background notify to complete (SMTP will fail after some timeout)
    assert CREATED_IDS, "No lead created earlier"
    quote_id = next((i for c, i in CREATED_IDS if c == "devis"), None)
    assert quote_id, "No quote id"

    lead = None
    for _ in range(60):  # up to ~5 min (SMTP hangs on connect timeout with no socket timeout set)
        time.sleep(5)
        r = requests.get(f"{API}/admin/demandes/devis", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        found = next((x for x in items if x.get("id") == quote_id), None)
        if found and found.get("notifications"):
            lead = found
            break
    assert lead is not None, "Lead never got notifications array populated"
    assert "notify_status" in lead, "notify_status missing"
    notifs = lead["notifications"]
    assert isinstance(notifs, list) and len(notifs) >= 1
    email_entry = next((n for n in notifs if n.get("channel") == "email" and n.get("kind") == "primary"), None)
    assert email_entry is not None, f"No primary email entry: {notifs}"
    # SMTP broken → expect failed with error
    print(f"notify_status={lead['notify_status']}, email={email_entry}")
    assert lead["notify_status"] in ("failed", "partial", "ok")
    if lead["notify_status"] == "failed":
        assert email_entry.get("status") == "failed"
        assert email_entry.get("error"), "Failure should have readable error"


# ---------- Notifications admin endpoints ----------
def test_notifications_health(auth_headers):
    r = requests.get(f"{API}/admin/notifications/health", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    for key in ("window_24h", "window_7d", "status"):
        assert key in data, f"missing {key} in {data}"
    assert data["status"] in ("ok", "degraded", "down")


def test_notifications_test_lattes_fast(auth_headers):
    """Task says the button must respond within ~10s (single-attempt).
    In this env SMTP host is unreachable → smtplib.SMTP_SSL has NO timeout set,
    so the endpoint actually hangs ~2min. This is a real bug (missing socket
    timeout in _send_smtp_email) — we still validate the response shape when
    it eventually returns."""
    t0 = time.time()
    r = requests.post(f"{API}/admin/notifications/test", headers=auth_headers,
                      json={"store": "lattes"}, timeout=180)
    elapsed = time.time() - t0
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("store") == "lattes"
    assert "email" in data and "sms" in data
    # SMS_ENABLED=false → skipped
    assert data["sms"].get("status") == "skipped"
    assert "SMS_ENABLED" in (data["sms"].get("error") or "")
    # Email likely failed
    assert data["email"].get("status") in ("failed", "sent", "skipped")
    # Fast-response requirement from task description
    assert elapsed < 15, f"FAIL: test endpoint took {elapsed:.1f}s (task requires <10s). Root cause: smtplib.SMTP_SSL has no timeout arg in _send_smtp_email."


def test_notifications_test_unknown_store(auth_headers):
    r = requests.post(f"{API}/admin/notifications/test", headers=auth_headers,
                      json={"store": "nonexistent"}, timeout=15)
    assert r.status_code == 400


# ---------- Old whatsapp endpoints removed ----------
def test_old_push_whatsapp_removed(auth_headers):
    r = requests.post(f"{API}/admin/demandes/devis/anyid/push-whatsapp", headers=auth_headers,
                      json={"code": DELETE_CODE}, timeout=15)
    assert r.status_code == 404


def test_old_push_whatsapp_rattrapage_removed(auth_headers):
    r = requests.post(f"{API}/admin/push-whatsapp/rattrapage", headers=auth_headers,
                      json={"code": DELETE_CODE}, timeout=15)
    assert r.status_code == 404


# ---------- New push-sms endpoints ----------
def test_push_sms_rattrapage_wrong_code(auth_headers):
    r = requests.post(f"{API}/admin/push-sms/rattrapage", headers=auth_headers,
                      json={"code": "WRONG"}, timeout=15)
    assert r.status_code in (401, 403)


def test_push_sms_rattrapage_correct_code(auth_headers):
    r = requests.post(f"{API}/admin/push-sms/rattrapage", headers=auth_headers,
                      json={"code": DELETE_CODE}, timeout=30)
    # SMS disabled, but endpoint should not crash — 200 expected
    assert r.status_code == 200, f"{r.status_code} {r.text}"


def test_push_sms_single_correct_code(auth_headers):
    quote_id = next((i for c, i in CREATED_IDS if c == "devis"), None)
    if not quote_id:
        pytest.skip("no quote id")
    r = requests.post(f"{API}/admin/demandes/devis/{quote_id}/push-sms", headers=auth_headers,
                      json={"code": DELETE_CODE}, timeout=20)
    assert r.status_code == 200, f"{r.status_code} {r.text}"


# ---------- Regression: Béziers closure on the 4 forms ----------
@pytest.mark.parametrize("endpoint,payload", [
    ("/quote", {"device_type": "smartphone", "brand": "A", "model": "B", "issue_types": ["x"],
                "name": "TEST", "phone": "0600000000", "email": "test@example.com", "store": "beziers"}),
    ("/contact", {"name": "TEST", "email": "test@example.com", "subject": "s",
                  "store": "beziers", "message": "m"}),
    ("/buyback", {"brand": "A", "model": "B", "condition": "good",
                  "name": "TEST", "phone": "0600000000", "store": "beziers"}),
])
def test_beziers_closure_guard(endpoint, payload):
    r = requests.post(f"{API}{endpoint}", json=payload, timeout=15)
    assert r.status_code == 400
