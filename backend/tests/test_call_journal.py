"""Backend regression tests for the S18 Call Journal & Status History feature."""
import os
import io
import csv
import pytest
import requests

def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if val:
        return val.rstrip("/")
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_backend_url()
ADMIN_EMAIL = "david.m@repairandco.fr"
ADMIN_PASSWORD = "Repair2025Admin!"
DELETE_CODE = "MOUR1"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
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


# ---------- Identity requirement (by field) ----------

class TestIdentityRequired:
    def test_status_patch_without_by_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
                               headers=headers, json={"status": "contacte", "by": ""}, timeout=15)
            assert r.status_code == 400, r.text
            assert "Identit" in r.text or "identit" in r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_call_log_without_by_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers, json={"by": "", "outcome": "joint", "detail": "rdv_pris"}, timeout=15)
            assert r.status_code == 400, r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_call_log_missing_by_field_returns_422_or_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers, json={"outcome": "numero_invalide"}, timeout=15)
            assert r.status_code in (400, 422), r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)


# ---------- Call log validation ----------

class TestCallLogValidation:
    def test_custom_callback_missing_at_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers,
                              json={"by": "David", "outcome": "joint", "detail": "rappeler", "callback_choice": "custom"},
                              timeout=15)
            assert r.status_code == 400, r.text
            assert "Date de rappel" in r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_refus_missing_reason_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers,
                              json={"by": "David", "outcome": "joint", "detail": "refus"}, timeout=15)
            assert r.status_code == 400, r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_invalid_outcome_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers, json={"by": "David", "outcome": "bogus"}, timeout=15)
            assert r.status_code == 400
        finally:
            _delete_test_lead(headers, "devis", lead_id)


# ---------- Auto nouveau -> contacte + persistence ----------

class TestCallLogFlow:
    def test_first_call_flips_nouveau_to_contacte(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers,
                              json={"by": "David", "outcome": "joint", "detail": "rdv_pris"}, timeout=15)
            assert r.status_code == 200, r.text
            body = r.json()
            assert body["new_status"] == "contacte"
            assert body["call_attempts_count"] == 1

            # Verify persistence via list endpoint
            r2 = requests.get(f"{BASE_URL}/api/admin/demandes-devis", headers=headers, timeout=15)
            assert r2.status_code == 200
            found = next((d for d in r2.json() if d["id"] == lead_id), None)
            assert found is not None
            assert found["status"] == "contacte"
            assert len(found.get("call_attempts") or []) == 1
            assert found["call_attempts"][0]["by"] == "David"
            assert found["call_attempts"][0]["detail"] == "rdv_pris"
            assert found.get("first_contact_at")
            assert found.get("assigned_to") == "David"
            # status_history must have the auto contacte push in addition to system entry
            statuses = [h["status"] for h in found.get("status_history") or []]
            assert "contacte" in statuses
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_assigned_to_not_overwritten(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            # First call by Alice
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers,
                              json={"by": "Alice", "outcome": "pas_de_reponse", "message_laisse": False}, timeout=15)
            assert r.status_code == 200
            # Second call by Bob
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers,
                              json={"by": "Bob", "outcome": "pas_de_reponse", "message_laisse": True}, timeout=15)
            assert r.status_code == 200
            r2 = requests.get(f"{BASE_URL}/api/admin/demandes-devis", headers=headers, timeout=15)
            found = next(d for d in r2.json() if d["id"] == lead_id)
            assert found["assigned_to"] == "Alice"  # never overwritten
        finally:
            _delete_test_lead(headers, "devis", lead_id)


# ---------- Injoignable rule ----------

class TestInjoignableRule:
    def test_injoignable_rejected_when_rule_not_met(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            # Log 3 pas_de_reponse (same day) — should still fail the 2-days rule
            for _ in range(3):
                requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
                              headers=headers,
                              json={"by": "David", "outcome": "pas_de_reponse", "message_laisse": False}, timeout=15)
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
                               headers=headers,
                               json={"status": "client_perdu", "by": "David", "lost_reason_code": "injoignable"}, timeout=15)
            assert r.status_code == 400, r.text
            assert "Injoignable" in r.text or "injoignable" in r.text or "Pas de r" in r.text
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_other_lost_reason_accepted(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
                               headers=headers,
                               json={"status": "client_perdu", "by": "David", "lost_reason_code": "prix"}, timeout=15)
            assert r.status_code == 200, r.text
            r2 = requests.get(f"{BASE_URL}/api/admin/demandes-devis", headers=headers, timeout=15)
            found = next(d for d in r2.json() if d["id"] == lead_id)
            assert found["status"] == "client_perdu"
            assert found["lost_reason_code"] == "prix"
        finally:
            _delete_test_lead(headers, "devis", lead_id)


# ---------- CSV export columns ----------

class TestCSVExport:
    def test_csv_headers_include_7_new_columns_in_order(self, headers):
        # Ensure at least one non-test lead exists — we cannot create one safely,
        # so we test the header via an is_test lead visibility check separately.
        # But the export excludes is_test; header ordering however comes from any
        # doc that has the field. We rely on real data already present.
        r = requests.get(f"{BASE_URL}/api/admin/export-all", headers=headers, timeout=30)
        assert r.status_code == 200, r.text
        text = r.content.decode("utf-8-sig")
        reader = csv.reader(io.StringIO(text), delimiter=";")
        header = next(reader)
        assert "Raison perte client" in header, header
        # Raw fields must never appear as headers
        for forbidden in ("status_history", "call_attempts", "tracking_since"):
            assert forbidden not in header, f"forbidden column {forbidden} in {header}"
        # 7 new columns present
        expected = [
            "Premier contact le", "Délai 1er contact (min ouvrées)", "Nb tentatives",
            "Nb messages laissés", "Dernier résultat d'appel", "Motif de perte (code)", "Traité par",
        ]
        # Nb tentatives / Nb messages laissés / Dernier résultat / Délai are always annotated
        # so they must be present. first_contact_at / lost_reason_code / assigned_to appear only
        # if any doc has them — we assert presence of the 4 always-present + verify ordering
        # relative to each other for those that are present.
        always_present = ["Délai 1er contact (min ouvrées)", "Nb tentatives",
                          "Nb messages laissés", "Dernier résultat d'appel"]
        for col in always_present:
            assert col in header, f"missing {col} in {header}"
        # Check ordering: every present new-column comes after 'Raison perte client'
        idx_lost = header.index("Raison perte client")
        present_new = [c for c in expected if c in header]
        indices = [header.index(c) for c in present_new]
        assert all(i > idx_lost for i in indices), f"new columns must come after 'Raison perte client': {header}"
        assert indices == sorted(indices), f"new columns not in required order: {[(c,header.index(c)) for c in present_new]}"

    def test_csv_excludes_is_test_leads(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.get(f"{BASE_URL}/api/admin/export-all", headers=headers, timeout=30)
            assert r.status_code == 200
            text = r.content.decode("utf-8-sig")
            # The test lead id shouldn't appear (uuid) — check by phone TEST placeholder or unique id
            assert lead_id not in text
        finally:
            _delete_test_lead(headers, "devis", lead_id)


# ---------- Timeline / status flow via patch ----------

class TestStatusHistory:
    def test_status_change_records_by_and_first_contact(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
                               headers=headers, json={"status": "contacte", "by": "Charlotte"}, timeout=15)
            assert r.status_code == 200, r.text
            r2 = requests.get(f"{BASE_URL}/api/admin/demandes-devis", headers=headers, timeout=15)
            found = next(d for d in r2.json() if d["id"] == lead_id)
            assert found["status"] == "contacte"
            assert found["assigned_to"] == "Charlotte"
            assert found.get("first_contact_at")
            hist = found.get("status_history") or []
            assert any(h["by"] == "Charlotte" and h["status"] == "contacte" for h in hist)
        finally:
            _delete_test_lead(headers, "devis", lead_id)
