"""Backend tests for Repair&Co Phase 1 simplification + Mini-Survey feature."""
import os
import io
import csv
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://repair-south-france.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "david.m@repairandco.fr"
ADMIN_PASSWORD = "Repair2025Admin!"

ALLOWED_STATUSES = {"en_attente", "pris_en_charge", "cloture"}


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_success(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert "token" in d and len(d["token"]) > 20


# ---------- FORM POSTS return id, status=en_attente ----------
class TestFormPosts:
    def test_post_quote_returns_id(self):
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_Apple", "model": "iPhone TEST",
            "issue_types": ["Écran cassé"], "name": "TEST_User", "phone": "0600000000",
            "email": "test@test.fr", "store": "lattes",
        }, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "success" and isinstance(d.get("id"), str) and len(d["id"]) > 10

    def test_post_contact_returns_id(self):
        r = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "TEST_C", "email": "t@t.fr", "subject": "TEST_subj", "message": "TEST_msg"
        }, timeout=20)
        assert r.status_code == 200
        assert "id" in r.json()

    def test_post_b2b_returns_id(self):
        r = requests.post(f"{BASE_URL}/api/b2b", json={
            "first_name": "TEST", "last_name": "B2B", "company": "TEST_Co",
            "email": "b@b.fr", "phone": "0600000000", "fleet_size": "10-50"
        }, timeout=20)
        assert r.status_code == 200
        assert "id" in r.json()

    def test_post_buyback_returns_id(self):
        r = requests.post(f"{BASE_URL}/api/buyback", json={
            "brand": "TEST", "model": "X", "condition": "bon",
            "name": "TEST_R", "phone": "0600000000", "store": "lattes"
        }, timeout=20)
        assert r.status_code == 200
        assert "id" in r.json()

    def test_quote_persists_with_en_attente(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_StatusBrand", "model": "Z",
            "issue_types": ["Batterie"], "name": "TEST_StatusUser", "phone": "0600000099",
            "email": "s@s.fr", "store": "lattes",
        }, timeout=20)
        new_id = r.json()["id"]
        lst = requests.get(f"{BASE_URL}/api/admin/demandes/devis", headers=auth_headers, timeout=15).json()
        item = next((x for x in lst if x["id"] == new_id), None)
        assert item is not None, "Newly created demand not found in admin list"
        assert item["status"] == "en_attente"


# ---------- CUSTOMER SURVEY (public, no auth) ----------
class TestCustomerSurvey:
    @pytest.fixture(scope="class")
    def created_devis_id(self):
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_Survey", "model": "M",
            "issue_types": ["Écran cassé"], "name": "TEST_SurveyUser", "phone": "0600000003",
            "email": "sv@s.fr", "store": "lattes",
        }, timeout=20)
        return r.json()["id"]

    def test_survey_saves_source_and_feedback(self, created_devis_id, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/demandes/devis/{created_devis_id}/survey",
            json={"customer_source": "google", "customer_feedback": "TEST très bien"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "saved"
        # Verify in admin list
        lst = requests.get(f"{BASE_URL}/api/admin/demandes/devis", headers=auth_headers, timeout=15).json()
        item = next((x for x in lst if x["id"] == created_devis_id), None)
        assert item is not None
        assert item.get("customer_source") == "google"
        assert item.get("customer_feedback") == "TEST très bien"

    def test_survey_no_auth_required(self, created_devis_id):
        # Don't send any auth header
        r = requests.post(
            f"{BASE_URL}/api/demandes/devis/{created_devis_id}/survey",
            json={"customer_source": "autre"},
            timeout=15,
        )
        assert r.status_code == 200

    def test_survey_empty_returns_no_change(self, created_devis_id):
        r = requests.post(
            f"{BASE_URL}/api/demandes/devis/{created_devis_id}/survey",
            json={},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "no_change"

    def test_survey_invalid_id_404(self):
        r = requests.post(
            f"{BASE_URL}/api/demandes/devis/INVALID_ID_zzz/survey",
            json={"customer_source": "google"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_survey_invalid_category_400(self, created_devis_id):
        r = requests.post(
            f"{BASE_URL}/api/demandes/INVALID_CAT/{created_devis_id}/survey",
            json={"customer_source": "google"},
            timeout=15,
        )
        assert r.status_code == 400


# ---------- STATUS PATCH (only 3 statuses) ----------
class TestStatusPatch:
    @pytest.fixture(scope="class")
    def fresh_devis_id(self):
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_StatusPatch", "model": "M",
            "issue_types": ["Batterie"], "name": "TEST_StatusPatchUser", "phone": "0600000004",
            "email": "sp@s.fr", "store": "lattes",
        }, timeout=20)
        return r.json()["id"]

    @pytest.mark.parametrize("st", ["en_attente", "pris_en_charge", "cloture"])
    def test_accepts_three_statuses(self, fresh_devis_id, auth_headers, st):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{fresh_devis_id}/status",
            headers=auth_headers, json={"status": st}, timeout=15,
        )
        assert r.status_code == 200, f"Status {st} rejected: {r.text}"

    def test_invalid_status_returns_400(self, fresh_devis_id, auth_headers):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{fresh_devis_id}/status",
            headers=auth_headers, json={"status": "totally_invalid_xyz"}, timeout=15,
        )
        assert r.status_code == 400

    @pytest.mark.parametrize("legacy,expected", [
        ("nouveau", "en_attente"),
        ("contacte", "pris_en_charge"),
        ("rdv_fixe", "pris_en_charge"),
        ("repare", "cloture"),
        ("annule", "cloture"),
    ])
    def test_legacy_status_mapping(self, fresh_devis_id, auth_headers, legacy, expected):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{fresh_devis_id}/status",
            headers=auth_headers, json={"status": legacy}, timeout=15,
        )
        assert r.status_code == 200
        # Verify persisted as new value
        lst = requests.get(f"{BASE_URL}/api/admin/demandes/devis", headers=auth_headers, timeout=15).json()
        item = next((x for x in lst if x["id"] == fresh_devis_id), None)
        assert item["status"] == expected, f"Legacy {legacy} should map to {expected}, got {item['status']}"


# ---------- STAFF FEEDBACK ----------
class TestStaffFeedback:
    @pytest.fixture(scope="class")
    def fresh_devis_id(self):
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_Staff", "model": "M",
            "issue_types": ["Batterie"], "name": "TEST_StaffUser", "phone": "0600000005",
            "email": "stf@s.fr", "store": "lattes",
        }, timeout=20)
        return r.json()["id"]

    def test_save_staff_feedback(self, fresh_devis_id, auth_headers):
        payload = {
            "staff_source": "TEST_recherche google",
            "staff_site_opinion": "TEST_site fluide",
            "staff_dislikes": "TEST_rien à signaler",
        }
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{fresh_devis_id}/feedback",
            headers=auth_headers, json=payload, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "updated"
        # Verify in list
        lst = requests.get(f"{BASE_URL}/api/admin/demandes/devis", headers=auth_headers, timeout=15).json()
        item = next((x for x in lst if x["id"] == fresh_devis_id), None)
        assert item["staff_source"] == "TEST_recherche google"
        assert item["staff_site_opinion"] == "TEST_site fluide"
        assert item["staff_dislikes"] == "TEST_rien à signaler"

    def test_staff_feedback_empty_no_change(self, fresh_devis_id, auth_headers):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{fresh_devis_id}/feedback",
            headers=auth_headers, json={}, timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["status"] == "no_change"

    def test_staff_feedback_unknown_id_404(self, auth_headers):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/zzz-no-such-id/feedback",
            headers=auth_headers, json={"staff_source": "TEST"}, timeout=15,
        )
        assert r.status_code == 404

    def test_staff_feedback_invalid_category_400(self, fresh_devis_id, auth_headers):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/foo/{fresh_devis_id}/feedback",
            headers=auth_headers, json={"staff_source": "TEST"}, timeout=15,
        )
        assert r.status_code == 400

    def test_staff_feedback_requires_auth(self, fresh_devis_id):
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{fresh_devis_id}/feedback",
            json={"staff_source": "TEST"}, timeout=15,
        )
        assert r.status_code == 401


# ---------- STATS NEW SHAPE ----------
class TestStats:
    def test_stats_has_new_keys_and_no_legacy(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # New keys
        for k in ["en_attente", "pris_en_charge", "cloture", "total",
                  "devis", "contact", "entreprise", "rachat"]:
            assert k in d, f"Missing key {k}"
            assert isinstance(d[k], int), f"{k} should be int, got {type(d[k])}"
        # Legacy keys should NOT be present
        for k in ["ca_total", "reparations", "panier_moyen"]:
            assert k not in d, f"Legacy key {k} should be removed but is present: {d.get(k)}"
        # Sanity
        assert d["total"] == d["devis"] + d["contact"] + d["entreprise"] + d["rachat"]


# ---------- DEMANDES LIST EXPOSES NEW FIELDS ----------
class TestDemandesList:
    def test_list_no_legacy_status_values(self, auth_headers):
        """All demands across all categories must have status in {en_attente, pris_en_charge, cloture}."""
        for cat in ["devis", "contact", "entreprise", "rachat"]:
            r = requests.get(f"{BASE_URL}/api/admin/demandes/{cat}", headers=auth_headers, timeout=15)
            assert r.status_code == 200
            for item in r.json():
                st = item.get("status")
                assert st in ALLOWED_STATUSES, f"Demand {item.get('id')} in {cat} has bad status: {st}"


# ---------- CSV EXPORT INCLUDES NEW COLUMNS ----------
class TestCsvExport:
    def test_csv_devis_has_survey_and_staff_columns(self, auth_headers):
        # Pre-create a demand and fill survey + staff feedback so columns exist
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_CSV", "model": "M",
            "issue_types": ["Écran cassé"], "name": "TEST_CSVUser", "phone": "0600000006",
            "email": "csv@s.fr", "store": "lattes",
        }, timeout=20)
        new_id = r.json()["id"]
        requests.post(
            f"{BASE_URL}/api/demandes/devis/{new_id}/survey",
            json={"customer_source": "google", "customer_feedback": "TEST_csv_fb"},
            timeout=15,
        )
        requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{new_id}/feedback",
            headers=auth_headers,
            json={"staff_source": "TEST_csv_src", "staff_site_opinion": "TEST_csv_op", "staff_dislikes": "TEST_csv_dis"},
            timeout=15,
        )

        # Now export CSV
        r = requests.get(f"{BASE_URL}/api/admin/demandes/devis/export", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        body = r.content
        assert body.startswith(b"\xef\xbb\xbf")
        text = body.decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(text), delimiter=';')
        cols = reader.fieldnames or []
        for required in ["customer_source", "customer_feedback",
                         "staff_source", "staff_site_opinion", "staff_dislikes"]:
            assert required in cols, f"CSV missing required column {required}; cols={cols}"
