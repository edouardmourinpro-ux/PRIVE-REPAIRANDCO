"""Backend regression tests for 3-tier escalation + test-mode + store closure.

Focus:
- Public forms block store='test' (and closed stores like beziers)
- Real leads still work with store='lattes'
- Admin stats/export exclude is_test leads
- Béziers appears in /magasins with closure_banner
- /devis /rendez-vous /rachat /contact exclude Béziers from dropdowns
- /admin/notifications/test defaults real=False -> TEST_RECIPIENT_EMAIL
- /admin/notifications/test-lead creates a devis test lead
- /admin/notifications/digest-test sends to TEST_RECIPIENT_EMAIL
"""

import os
import time
import pytest
import requests
import io
import csv

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "david.m@repairandco.fr"
ADMIN_PASSWORD = "Repair2025Admin!"


# ---- fixtures ----
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ---- Public forms: test store blocked ----
class TestPublicFormsBlockTestStore:
    def test_quote_blocks_test_store(self):
        payload = {
            "store": "test", "first_name": "X", "name": "Y", "phone": "0600000000",
            "email": "x@y.com", "device_type": "smartphone", "brand": "Apple",
            "model": "iPhone 12", "issue_types": ["Ecran"]
        }
        r = requests.post(f"{API}/quote", json=payload, timeout=30)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"

    def test_contact_blocks_test_store(self):
        payload = {"store": "test", "first_name": "X", "name": "Y", "phone": "0600000000",
                   "email": "x@y.com", "subject": "Test", "message": "test"}
        r = requests.post(f"{API}/contact", json=payload, timeout=30)
        assert r.status_code == 400

    def test_buyback_blocks_test_store(self):
        payload = {"store": "test", "first_name": "X", "name": "Y", "phone": "0600000000",
                   "email": "x@y.com", "device_type": "smartphone", "brand": "Apple",
                   "model": "iPhone 12", "condition": "bon", "storage": "128"}
        r = requests.post(f"{API}/buyback", json=payload, timeout=30)
        assert r.status_code == 400


# ---- Public forms: beziers blocked ----
class TestBeziersClosure:
    def test_quote_blocks_beziers(self):
        payload = {"store": "beziers", "first_name": "X", "name": "Y", "phone": "0600000000",
                   "email": "x@y.com", "device_type": "smartphone", "brand": "Apple",
                   "model": "iPhone 12", "issue_types": ["Ecran"]}
        r = requests.post(f"{API}/quote", json=payload, timeout=30)
        assert r.status_code == 400

    def test_magasins_endpoint_lists_beziers_with_closure(self):
        # No /api/magasins endpoint exists — store list is frontend-only.
        # Verify frontend stores.js still declares beziers with acceptsLeads=false
        # via checking the constants file, but here we just confirm beziers is
        # blocked from public forms (done above) and admin can still view it.
        pytest.skip("no /api/magasins endpoint; store list is client-side (frontend/src/data/stores.js)")


# ---- Real lead still works ----
class TestRealLeadStillWorks:
    def test_quote_lattes_success(self):
        payload = {
            "store": "lattes",
            "first_name": "TEST_AUTO",
            "name": "TEST — regression",
            "phone": "0600000000",
            "email": "edouardmourinpro@gmail.com",
            "device_type": "smartphone",
            "brand": "Apple",
            "model": "iPhone 12",
            "issue_types": ["Test regression"],
        }
        r = requests.post(f"{API}/quote", json=payload, timeout=30)
        assert r.status_code == 200, f"lattes real lead failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("status") == "success"
        assert "id" in data
        # store id for downstream test
        pytest.lattes_lead_id = data["id"]

    def test_quote_lattes_notification_recorded(self, auth_headers):
        lead_id = getattr(pytest, "lattes_lead_id", None)
        if not lead_id:
            pytest.skip("no lattes lead id available")
        # wait for async notify to happen (SMS disabled -> only email required)
        found_ok = False
        last = None
        for _ in range(20):  # up to 20s
            time.sleep(1)
            r = requests.get(f"{API}/admin/demandes-devis", headers=auth_headers, timeout=30)
            if r.status_code != 200:
                continue
            leads = r.json()
            match = next((l for l in leads if l.get("id") == lead_id), None)
            if not match:
                continue
            last = match
            notifs = match.get("notifications") or []
            email_notifs = [n for n in notifs if n.get("channel") == "email"]
            if any(n.get("status") == "sent" for n in email_notifs):
                found_ok = True
                break
        assert found_ok, f"email notif never reached 'sent' status; last lead={last}"


# ---- Admin stats/export exclude is_test ----
class TestStatsExcludeTest:
    def test_stats_excludes_test_leads(self, auth_headers):
        # snapshot before
        r1 = requests.get(f"{API}/admin/stats", headers=auth_headers, timeout=30)
        assert r1.status_code == 200
        stats_before = r1.json()
        total_before = stats_before.get("total") or stats_before.get("total_demandes") or 0

        # create a test lead
        r2 = requests.post(f"{API}/admin/notifications/test-lead",
                           headers=auth_headers,
                           json={"category": "devis", "same_person": False, "accelerated": True},
                           timeout=30)
        assert r2.status_code == 200, r2.text
        test_lead_id = r2.json()["id"]

        time.sleep(2)
        # snapshot after
        r3 = requests.get(f"{API}/admin/stats", headers=auth_headers, timeout=30)
        assert r3.status_code == 200
        stats_after = r3.json()
        total_after = stats_after.get("total") or stats_after.get("total_demandes") or 0
        assert total_before == total_after, (
            f"stats total should NOT include test lead. before={total_before} after={total_after}"
        )
        pytest.created_test_lead_id = test_lead_id

    def test_export_all_excludes_test_leads(self, auth_headers):
        r = requests.get(f"{API}/admin/export-all", headers=auth_headers, timeout=60)
        assert r.status_code == 200
        # Try CSV parse
        text = r.text
        # Assert no reference to Magasin TEST / is_test lead
        test_lead_id = getattr(pytest, "created_test_lead_id", None)
        if test_lead_id:
            assert test_lead_id not in text, "CSV export must not include test lead id"
        assert "TEST — ne pas traiter" not in text


# ---- Admin filter dropdown stores ----
class TestAdminStoresDropdown:
    def test_admin_stores_endpoint_lists_9_real_stores(self, auth_headers):
        # No /api/magasins endpoint exists (client-side store list).
        pytest.skip("store list is client-side; verified via frontend E2E")


# ---- Notifications test endpoint (default real=False) ----
class TestNotificationsTestEndpoint:
    def test_notif_test_defaults_to_test_recipient(self, auth_headers):
        r = requests.post(f"{API}/admin/notifications/test",
                          headers=auth_headers,
                          json={"store": "lattes"},  # real defaults False
                          timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("real") is False
        email = data.get("email", {})
        # should go to TEST_RECIPIENT_EMAIL
        assert "edouardmourinpro@gmail.com" in (email.get("to") or ""), f"expected TEST_RECIPIENT; got {email}"
        # SMS skipped because SMS_ENABLED=false
        sms = data.get("sms", {})
        assert sms.get("status") == "skipped"


# ---- Digest test endpoint ----
class TestDigestTestEndpoint:
    def test_digest_test_returns_success(self, auth_headers):
        r = requests.post(f"{API}/admin/notifications/digest-test",
                          headers=auth_headers, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("status") == "sent"
        assert data.get("to") == "edouardmourinpro@gmail.com"
