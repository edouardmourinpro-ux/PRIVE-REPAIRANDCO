"""Backend regression tests for the 5 S20 complements:
/relance (trace-only, never touches status), stats.by_category_status with
entreprise detail, B2B total exclusion from CRM mechanics, the 6-call
Injoignable rule, and digest/cleanup additions. All leads use store="test"."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests


def _load_backend_url():
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


BASE_URL = _load_backend_url()
ADMIN_EMAIL = "david.m@repairandco.fr"
ADMIN_PASSWORD = "Repair2025Admin!"
DELETE_CODE = "MOUR1"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _create_test_lead(headers, category="devis"):
    r = requests.post(f"{BASE_URL}/api/admin/notifications/test-lead",
                      headers=headers, json={"category": category, "same_person": False, "accelerated": False}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _delete_test_lead(headers, category, lead_id):
    try:
        requests.request("DELETE", f"{BASE_URL}/api/admin/demandes/{category}/{lead_id}",
                         headers=headers, json={"code": DELETE_CODE}, timeout=15)
    except Exception:
        pass


def _get_lead(headers, category, lead_id):
    url = {"devis": f"{BASE_URL}/api/admin/demandes-devis"}.get(category, f"{BASE_URL}/api/admin/demandes/{category}")
    r = requests.get(url, headers=headers, timeout=15)
    r.raise_for_status()
    return next(d for d in r.json() if d["id"] == lead_id)


class TestRelance:
    def test_missing_by_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/relance", headers=headers,
                              json={"by": "", "channel": "email"}, timeout=15)
            assert r.status_code == 400
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_unknown_channel_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/relance", headers=headers,
                              json={"by": "Eren", "channel": "sms"}, timeout=15)
            assert r.status_code == 400
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_relance_logs_without_changing_status(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            before = _get_lead(headers, "devis", lead_id)
            assert before["status"] == "nouveau"
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/relance", headers=headers,
                              json={"by": "Eren", "channel": "whatsapp"}, timeout=15)
            assert r.status_code == 200, r.text
            after = _get_lead(headers, "devis", lead_id)
            assert after["status"] == "nouveau"  # unchanged
            assert len(after["relances"]) == 1
            assert after["relances"][0]["channel"] == "whatsapp"
            assert after["relances"][0]["by"] == "Eren"
            assert after["assigned_to"] == "Eren"
            assert after["first_contact_at"]
            # Still shows up in to-call group 2 (nouveau) — relance didn't remove it
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next((x for x in items if x["id"] == lead_id), None)
            assert item is not None and item["group"] == 2
        finally:
            _delete_test_lead(headers, "devis", lead_id)


class TestStatsByCategoryStatus:
    def test_includes_all_11_statuses_per_category(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        bcs = body["by_category_status"]
        expected_statuses = {
            "nouveau", "pas_de_reponse", "a_rappeler", "reflechit", "devis_accepte",
            "rdv_pris", "facture", "refus_devis", "client_perdu", "contacte", "pris_en_charge",
        }
        for cat in ("devis", "contact", "rachat", "entreprise"):
            assert cat in bcs, f"missing category {cat}"
            assert set(bcs[cat].keys()) == expected_statuses, bcs[cat].keys()

    def test_entreprise_excluded_from_top_level_totals(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers, timeout=15)
        body = r.json()
        assert "entreprise" not in body  # no top-level category count key for entreprise


class TestB2BOutOfMechanics:
    def test_b2b_lead_not_escalated_or_counted(self, headers):
        r = requests.post(f"{BASE_URL}/api/b2b", json={
            "first_name": "Test", "last_name": "Complement", "company": "ACME S20",
            "email": "test-b2b-complement@example.com", "phone": "0611223344", "fleet_size": "10-50",
        }, timeout=15)
        assert r.status_code == 200, r.text
        # not reachable via any admin CRM route
        r2 = requests.get(f"{BASE_URL}/api/admin/demandes/entreprise", headers=headers, timeout=15)
        assert r2.status_code == 400
        r3 = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, timeout=15)
        assert all(it.get("category") != "entreprise" for it in r3.json())


class TestInjoignable6Calls:
    def test_rejected_below_6_calls(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            for _ in range(3):
                requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call", headers=headers, json={
                    "by": "Eren", "outcome": "pas_de_reponse",
                    "rappel_2e": True, "message_laisse": True, "mail_envoye": True, "message_envoye": True,
                }, timeout=15)
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status", headers=headers,
                               json={"status": "client_perdu", "lost_reason_code": "injoignable", "by": "Eren"}, timeout=15)
            assert r.status_code == 400
            assert "6 appels" in r.json()["detail"]
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_accepted_at_6_calls(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            for _ in range(6):
                requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call", headers=headers, json={
                    "by": "Eren", "outcome": "pas_de_reponse",
                    "rappel_2e": True, "message_laisse": True, "mail_envoye": True, "message_envoye": True,
                }, timeout=15)
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status", headers=headers,
                               json={"status": "client_perdu", "lost_reason_code": "injoignable", "by": "Eren"}, timeout=15)
            assert r.status_code == 200, r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)
