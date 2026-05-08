"""Backend tests for Repair&Co Mini-CRM admin endpoints."""
import os
import io
import csv
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://repair-south-france.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "david.m@repairandco.fr"
ADMIN_PASSWORD = "Repair2025Admin!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
    return data["token"]


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
        assert "token" in d and "role" in d

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401

    def test_admin_endpoints_require_auth(self):
        for path in ["/api/admin/stats", "/api/admin/demandes/devis"]:
            r = requests.get(f"{BASE_URL}{path}", timeout=15)
            assert r.status_code == 401, f"{path} should require auth, got {r.status_code}"


# ---------- STATS ----------
class TestStats:
    def test_stats_shape(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ["devis", "contact", "entreprise", "rachat", "total", "ca_total", "reparations", "panier_moyen"]:
            assert k in d, f"Missing key {k} in stats"
        assert d["total"] == d["devis"] + d["contact"] + d["entreprise"] + d["rachat"]

    def test_stats_store_filter(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers,
                         params={"store": "lattes"}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "total" in d


# ---------- DEMANDES LIST ----------
class TestDemandesList:
    @pytest.mark.parametrize("cat", ["devis", "contact", "entreprise", "rachat"])
    def test_list_each_category(self, auth_headers, cat):
        r = requests.get(f"{BASE_URL}/api/admin/demandes/{cat}", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_list_invalid_category(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/demandes/foobar", headers=auth_headers, timeout=15)
        assert r.status_code == 400

    def test_list_with_store_filter(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/demandes/devis",
                         headers=auth_headers, params={"store": "lattes"}, timeout=15)
        assert r.status_code == 200
        for item in r.json():
            assert item.get("store") == "lattes"


# ---------- FORM SUBMISSIONS (create test data) ----------
class TestFormPosts:
    """Verify public form endpoints persist with status=nouveau and ca=0"""

    def test_post_quote(self):
        payload = {
            "device_type": "smartphone", "brand": "TEST_Apple", "model": "iPhone TEST",
            "issue_types": ["Écran cassé"], "name": "TEST_User", "phone": "0600000000",
            "email": "test@test.fr", "store": "lattes",
        }
        r = requests.post(f"{BASE_URL}/api/quote", json=payload, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d.get("status") == "success" and "id" in d
        return d["id"]

    def test_post_contact(self):
        r = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "TEST_C", "email": "t@t.fr", "subject": "TEST", "message": "TEST"
        }, timeout=20)
        assert r.status_code == 200

    def test_post_b2b(self):
        r = requests.post(f"{BASE_URL}/api/b2b", json={
            "first_name": "TEST", "last_name": "B2B", "company": "TEST_Co",
            "email": "b@b.fr", "phone": "0600000000", "fleet_size": "10-50"
        }, timeout=20)
        assert r.status_code == 200

    def test_post_buyback(self):
        r = requests.post(f"{BASE_URL}/api/buyback", json={
            "brand": "TEST", "model": "X", "condition": "bon",
            "name": "TEST_R", "phone": "0600000000", "store": "lattes"
        }, timeout=20)
        assert r.status_code == 200


# ---------- PATCH STATUS / CA ----------
class TestPatchOps:
    @pytest.fixture(scope="class")
    def created_devis(self, auth_headers):
        # Create then fetch its id
        r = requests.post(f"{BASE_URL}/api/quote", json={
            "device_type": "smartphone", "brand": "TEST_Patch", "model": "ZZZ",
            "issue_types": ["Batterie"], "name": "TEST_Patch_User",
            "phone": "0600000001", "email": "patch@test.fr", "store": "lattes",
        }, timeout=20)
        assert r.status_code == 200
        return r.json()["id"]

    def test_patch_status(self, auth_headers, created_devis):
        r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{created_devis}/status",
                           headers=auth_headers, json={"status": "contacte"}, timeout=15)
        assert r.status_code == 200
        # Verify
        r2 = requests.get(f"{BASE_URL}/api/admin/demandes/devis", headers=auth_headers, timeout=15)
        item = next((x for x in r2.json() if x["id"] == created_devis), None)
        assert item and item["status"] == "contacte"

    def test_patch_invalid_category(self, auth_headers, created_devis):
        r = requests.patch(f"{BASE_URL}/api/admin/demandes/foo/{created_devis}/status",
                           headers=auth_headers, json={"status": "contacte"}, timeout=15)
        assert r.status_code == 400

    def test_patch_unknown_id(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/zzz-no-such/status",
                           headers=auth_headers, json={"status": "contacte"}, timeout=15)
        assert r.status_code == 404

    def test_repare_with_ca_updates_stats(self, auth_headers, created_devis):
        # Baseline
        s0 = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=15).json()
        # Set repare + ca=89
        r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{created_devis}/status",
                           headers=auth_headers, json={"status": "repare"}, timeout=15)
        assert r.status_code == 200
        r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{created_devis}/ca",
                           headers=auth_headers, json={"ca": 89}, timeout=15)
        assert r.status_code == 200
        s1 = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=15).json()
        assert s1["ca_total"] >= s0["ca_total"] + 89 - 0.01
        assert s1["reparations"] == s0["reparations"] + 1
        assert s1["reparations"] > 0
        assert s1["panier_moyen"] > 0
        # Restore
        requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{created_devis}/ca",
                       headers=auth_headers, json={"ca": 0}, timeout=15)
        requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{created_devis}/status",
                       headers=auth_headers, json={"status": "nouveau"}, timeout=15)
        s2 = requests.get(f"{BASE_URL}/api/admin/stats", headers=auth_headers, timeout=15).json()
        assert s2["reparations"] == s0["reparations"]


# ---------- CSV EXPORT ----------
class TestCsvExport:
    @pytest.mark.parametrize("cat", ["devis", "contact", "entreprise", "rachat"])
    def test_csv_export(self, auth_headers, cat):
        r = requests.get(f"{BASE_URL}/api/admin/demandes/{cat}/export",
                         headers=auth_headers, timeout=20)
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "csv" in ct.lower(), f"Content-Type missing csv: {ct}"
        assert r.headers.get("content-disposition", "").lower().startswith("attachment"), \
            f"Missing attachment header: {r.headers.get('content-disposition')}"
        body = r.content
        # BOM check
        assert body.startswith(b"\xef\xbb\xbf"), "CSV must start with UTF-8 BOM"
        text = body.decode("utf-8-sig")
        # Use ; delimiter
        first_line = text.splitlines()[0] if text.splitlines() else ""
        # Only check structure if there's data
        if first_line:
            assert ";" in first_line, f"Expected ';' delimiter in header: {first_line}"
            # Verify status & ca columns present (when there are rows)
            reader = csv.DictReader(io.StringIO(text), delimiter=';')
            rows = list(reader)
            if rows:
                assert "status" in reader.fieldnames, f"status column missing: {reader.fieldnames}"
                assert "ca" in reader.fieldnames, f"ca column missing: {reader.fieldnames}"

    def test_csv_invalid_category(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/demandes/foo/export",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 400
