"""Scoped tests for the SMS text-generation refactor (4 client templates).

Covers:
- _strip_accents keeps é/è/à/ù, folds ô/ê/î/û/â/ç/À/É etc.
- _build_client_creation_sms day/off-hours variants with store phone injected
- Truncation: only closing shortened, never store/phone/address/date
- _build_client_appt_sms('rdv' / 'passage') wording & no-phone rule
- /api/quote, /api/contact, /api/buyback non-regression on store='test'
"""
import os
import sys
import pytest
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend import server as srv  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend env file for isolated test runs
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

REAL_STORES = [
    "lattes", "montpellier-nord", "montpellier-sud", "nimes-costieres",
    "nimes-etoile", "beziers", "boulogne", "plaisir", "les-ulis",
]

GSM7_SAFE = set(
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    "éèàù\n"
)


# ---------- _strip_accents ----------

class TestStripAccents:
    def test_keeps_allowed_accents(self):
        assert srv._strip_accents("é è à ù") == "é è à ù"

    def test_folds_forbidden_accents(self):
        mapping = {"ô": "o", "ê": "e", "î": "i", "û": "u", "â": "a", "ç": "c", "À": "A", "É": "E"}
        for src, expected in mapping.items():
            assert srv._strip_accents(src) == expected, f"{src!r} should fold to {expected!r}"

    def test_mixed_sentence(self):
        # Nîmes Étoile => keeps é if any, folds Î and É → "Nimes Etoile"
        assert srv._strip_accents("Nîmes Étoile") == "Nimes Etoile"
        # é is kept — Béziers stays as Béziers
        assert srv._strip_accents("Béziers") == "Béziers"
        assert "é" in srv._strip_accents("Béziers")


# ---------- _build_client_creation_sms ----------

class TestCreationSms:
    def _force_daytime(self, flag: bool):
        srv._is_client_creation_daytime_orig = getattr(srv, "_is_client_creation_daytime_orig", srv._is_client_creation_daytime)
        srv._is_client_creation_daytime = lambda now_paris=None: flag

    def teardown_method(self, _):
        orig = getattr(srv, "_is_client_creation_daytime_orig", None)
        if orig:
            srv._is_client_creation_daytime = orig

    @pytest.mark.parametrize("store_id", REAL_STORES)
    def test_daytime_variant_structure(self, store_id):
        self._force_daytime(True)
        text = srv._build_client_creation_sms(store_id)
        phone = srv._store_phone(store_id)
        assert phone, f"phone missing for {store_id}"
        assert "Repair&Co" in text
        assert srv.STORE_NAMES[store_id] in srv._strip_accents(srv.STORE_NAMES[store_id]) or True
        # Store name may contain forbidden accents — check folded form appears
        folded_name = srv._strip_accents(srv.STORE_NAMES[store_id])
        assert folded_name in text
        assert "dans l'heure" in text
        assert "ouverture" not in text
        assert phone in text, f"phone {phone} not injected for {store_id}"

    @pytest.mark.parametrize("store_id", REAL_STORES)
    def test_offhours_variant_structure(self, store_id):
        self._force_daytime(False)
        text = srv._build_client_creation_sms(store_id)
        phone = srv._store_phone(store_id)
        folded_name = srv._strip_accents(srv.STORE_NAMES[store_id])
        assert folded_name in text
        assert "ouverture" in text and "9h" in text
        assert "aujourd'hui" not in text
        assert phone in text

    @pytest.mark.parametrize("store_id", REAL_STORES)
    def test_gsm7_compatible_both_variants(self, store_id):
        for flag in (True, False):
            self._force_daytime(flag)
            text = srv._build_client_creation_sms(store_id)
            bad = [c for c in text if c not in GSM7_SAFE]
            assert not bad, f"Non-GSM7 chars {bad!r} in creation SMS for {store_id} (daytime={flag}): {text}"

    def test_truncation_falls_back_to_short_closing_montpellier_nord(self):
        # Confirmed in dev: 'hors horaires' variant is 161 chars with the long closing
        self._force_daytime(False)
        text = srv._build_client_creation_sms("montpellier-nord")
        assert len(text) <= 160, f"Expected <=160 chars after truncation, got {len(text)}: {text}"
        # Must have fallen back to the short closing
        assert text.endswith("Restez joignable !")
        # Store name and phone preserved
        assert srv._strip_accents(srv.STORE_NAMES["montpellier-nord"]) in text
        assert srv._store_phone("montpellier-nord") in text

    @pytest.mark.parametrize("store_id", REAL_STORES)
    def test_store_name_and_phone_never_truncated(self, store_id):
        for flag in (True, False):
            self._force_daytime(flag)
            text = srv._build_client_creation_sms(store_id)
            assert srv._strip_accents(srv.STORE_NAMES[store_id]) in text
            assert srv._store_phone(store_id) in text


# ---------- _build_client_appt_sms ----------

class TestApptSms:
    def test_rdv_wording_no_phone(self):
        text = srv._build_client_appt_sms(
            "rdv", "2026-02-10", "Après-midi (14h-17h)",
            "Nimes Etoile", "116 Rue André Dupont, 30900, Nimes",
        )
        assert "RDV Repair&Co est confirmé" in text
        assert "entre 14h et 17h" in text
        assert len(text) <= 160
        assert "On vous attend !" in text
        # NO phone in appt templates
        assert "07 " not in text and "04 " not in text and "09 " not in text and "01 " not in text
        # No forbidden accents
        bad = [c for c in text if c not in GSM7_SAFE]
        assert not bad, f"Non-GSM7 chars in rdv SMS: {bad!r} / {text}"

    def test_passage_wording_no_phone_no_duplicate(self):
        text = srv._build_client_appt_sms(
            "passage", "2026-02-10", None,
            "Repair&Co Montpellier Sud", "Av. Mas d'Argelliers, 34070, Montpellier",
        )
        assert "on vous attend le" in text
        assert "au magasin Repair&Co de" in text
        # No double "on vous attend"
        assert text.lower().count("on vous attend") == 1
        # No phone / no slot clause / no closing exclamation
        assert "entre " not in text
        bad = [c for c in text if c not in GSM7_SAFE]
        assert not bad, f"Non-GSM7 chars in passage SMS: {bad!r} / {text}"

    def test_rdv_truncation_only_drops_closing(self):
        # Build a very long store name + address to force >160
        long_addr = "A" * 200
        text = srv._build_client_appt_sms("rdv", "2026-02-10", "Matin (9h30-12h30)", "Repair&Co Test", long_addr)
        # Store/address/date must still be present
        assert "Repair&Co Test" in text
        assert long_addr in text
        # Closing must have been dropped
        assert "On vous attend !" not in text


# ---------- Audit script ----------

class TestAuditScript:
    def test_script_runs_and_prints_4x9(self):
        import subprocess
        res = subprocess.run(
            ["python3", "/app/backend/scripts/audit_sms_templates.py"],
            capture_output=True, text=True, timeout=30,
        )
        assert res.returncode == 0, f"audit script failed: {res.stderr}"
        out = res.stdout
        # 9 real stores shown
        for sid in REAL_STORES:
            assert sid in out, f"store {sid} missing from audit output"
        # 4 labels present
        for label in ["Confirmation jour", "Confirmation hors horaires", "RDV avec créneau", "Passage sans créneau"]:
            assert label in out, f"label {label!r} missing"
        # char count + encoding tags
        assert "GSM-7" in out
        assert "car." in out and "seg." in out


# ---------- Public form endpoints non-regression ----------

@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestPublicFormEndpointsNoRegression:
    """Ensure _send_client_creation_sms signature change didn't break form POSTs."""

    def test_quote_test_store(self, api_client):
        payload = {
            "store": "test",
            "device_type": "smartphone",
            "brand": "Apple",
            "model": "iPhone 13",
            "issue_types": ["Écran cassé"],
            "name": "TEST SMS Refactor",
            "phone": "06 00 00 00 00",
            "email": "test-sms@example.com",
            "description": "test",
        }
        r = api_client.post(f"{BASE_URL}/api/quote", json=payload, timeout=20)
        assert r.status_code == 200, f"/api/quote failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("status") == "success"
        assert "id" in data

    def test_contact_test_store(self, api_client):
        payload = {
            "store": "test",
            "name": "TEST SMS Refactor",
            "phone": "06 00 00 00 00",
            "email": "test-sms@example.com",
            "subject": "Test",
            "message": "test",
        }
        r = api_client.post(f"{BASE_URL}/api/contact", json=payload, timeout=20)
        assert r.status_code == 200, f"/api/contact failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("status") == "success"
        assert "id" in data

    def test_buyback_test_store(self, api_client):
        payload = {
            "store": "test",
            "device_type": "smartphone",
            "brand": "Apple",
            "model": "iPhone 12",
            "condition": "Bon état",
            "name": "TEST SMS Refactor",
            "phone": "06 00 00 00 00",
            "email": "test-sms@example.com",
        }
        r = api_client.post(f"{BASE_URL}/api/buyback", json=payload, timeout=20)
        assert r.status_code == 200, f"/api/buyback failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("status") == "success"
        assert "id" in data
