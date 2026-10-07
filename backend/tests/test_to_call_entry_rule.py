"""Tests for the new to-call entry rule: a lead enters the pipeline if EITHER
is_tracked (created_at >= tracking_since) OR it already has >=1 call_attempts.
Also tests the Injoignable 6-call gate interaction (bypass only when
untracked AND zero calls)."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")
DELETE_CODE = "MOUR1"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "david.m@repairandco.fr",
        "password": "Repair2025Admin!",
    })
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


def _create_test_lead(headers):
    r = requests.post(
        f"{BASE_URL}/api/admin/notifications/test-lead",
        headers=headers,
        json={"category": "devis", "send_email": False, "send_sms": False},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _delete(headers, lead_id):
    requests.request(
        "DELETE",
        f"{BASE_URL}/api/admin/demandes/devis/{lead_id}",
        headers=headers,
        json={"code": DELETE_CODE},
    )


def _make_old_untouched(db, lead_id):
    """Simulate an old untouched lead: created_at far in past, no tracking_since,
    no call_attempts, status=nouveau."""
    old = (datetime.now(timezone.utc) - timedelta(days=60)).isoformat()
    db.demandes_devis.update_one(
        {"id": lead_id},
        {"$set": {"created_at": old, "status": "nouveau", "call_attempts": []},
         "$unset": {"tracking_since": "", "next_callback_at": ""}},
    )


# ---------- Rule tests ----------

def test_old_untouched_excluded_from_to_call(headers, db):
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        assert r.status_code == 200
        ids = [i["id"] for i in r.json()]
        assert lead_id not in ids, "old untouched lead must NOT appear in to-call"
    finally:
        _delete(headers, lead_id)


def test_old_untouched_counted_in_older_open(headers, db):
    lead_id = _create_test_lead(headers)
    try:
        # Baseline
        base = requests.get(f"{BASE_URL}/api/admin/to-call/older-open-count",
                            headers=headers, params={"store": "test"}).json()["count"]
        _make_old_untouched(db, lead_id)
        after = requests.get(f"{BASE_URL}/api/admin/to-call/older-open-count",
                             headers=headers, params={"store": "test"}).json()["count"]
        assert after == base + 1, f"older-open-count should include this lead (base={base}, after={after})"
    finally:
        _delete(headers, lead_id)


def test_one_call_excludes_from_older_open_count(headers, db):
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        before = requests.get(f"{BASE_URL}/api/admin/to-call/older-open-count",
                              headers=headers, params={"store": "test"}).json()["count"]
        # Log one call
        r = requests.post(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
            headers=headers,
            json={"outcome": "pas_de_reponse", "rappel_2e": True,
                  "message_laisse": True, "mail_envoye": True, "message_envoye": True,
                  "by": "TEST"},
        )
        assert r.status_code == 200, r.text
        after = requests.get(f"{BASE_URL}/api/admin/to-call/older-open-count",
                             headers=headers, params={"store": "test"}).json()["count"]
        assert after == before - 1, f"after 1 call, lead must be excluded from older-open (before={before}, after={after})"

        # Still NOT in to-call because <180 business min elapsed
        ids = [i["id"] for i in requests.get(
            f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"}).json()]
        assert lead_id not in ids, "lead should not yet appear in to-call (relance 3h window not elapsed)"
    finally:
        _delete(headers, lead_id)


def test_backdated_call_puts_lead_in_group3(headers, db):
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        # Log one call
        r = requests.post(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
            headers=headers,
            json={"outcome": "pas_de_reponse", "rappel_2e": True,
                  "message_laisse": True, "mail_envoye": True, "message_envoye": True,
                  "by": "TEST"},
        )
        assert r.status_code == 200, r.text
        # Backdate the call attempt 2 days ago
        backdated = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        doc = db.demandes_devis.find_one({"id": lead_id})
        attempts = doc["call_attempts"]
        attempts[-1]["at"] = backdated
        db.demandes_devis.update_one({"id": lead_id}, {"$set": {"call_attempts": attempts}})

        items = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers,
                             params={"store": "test"}).json()
        ours = [i for i in items if i["id"] == lead_id]
        assert len(ours) == 1, "lead should appear in to-call after backdated call"
        it = ours[0]
        assert it["group"] == 3, f"expected group 3 (relance), got {it['group']}"
        # Label format: "{N}e appel (pas de réponse le DD/MM à HHhMM)"
        import re
        assert re.match(r"^\de appel \(pas de réponse le \d{2}/\d{2} à \d{2}h\d{2}\)$", it["label"]), it["label"]
        # N = call count + 1 = 2
        assert it["label"].startswith("2e appel"), it["label"]
    finally:
        _delete(headers, lead_id)


def test_callback_flow_old_lead(headers, db):
    """After calling an old untouched lead with outcome=joint/detail=rappeler,
    it appears in group 1 (overdue) or 5 (later today)."""
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        # Log a joint+rappeler call with custom callback in past -> group 1
        past = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        r = requests.post(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
            headers=headers,
            json={"outcome": "joint", "detail": "rappeler",
                  "callback_choice": "custom", "callback_at": past, "by": "TEST"},
        )
        assert r.status_code == 200, r.text
        items = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers,
                             params={"store": "test"}).json()
        ours = [i for i in items if i["id"] == lead_id]
        assert len(ours) == 1, "old lead should enter to-call after callback scheduled"
        assert ours[0]["group"] == 1, ours[0]
        assert "en retard" in ours[0]["label"], ours[0]["label"]
    finally:
        _delete(headers, lead_id)


# ---------- Injoignable 6-call gate ----------

def test_injoignable_bypass_zero_calls(headers, db):
    """Old untouched lead with 0 call_attempts can be marked Injoignable."""
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
            headers=headers,
            json={"status": "client_perdu", "lost_reason_code": "injoignable", "by": "TEST"},
        )
        assert r.status_code == 200, f"bypass should allow Injoignable with 0 calls: {r.status_code} {r.text}"
    finally:
        _delete(headers, lead_id)


def test_injoignable_blocked_after_one_call(headers, db):
    """Old lead with >=1 call_attempts: 6-call rule applies again, so 1 call -> 400."""
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        # Log one call
        r = requests.post(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/call",
            headers=headers,
            json={"outcome": "pas_de_reponse", "rappel_2e": True,
                  "message_laisse": True, "mail_envoye": True, "message_envoye": True,
                  "by": "TEST"},
        )
        assert r.status_code == 200, r.text
        # Try Injoignable -> should 400
        r2 = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
            headers=headers,
            json={"status": "client_perdu", "lost_reason_code": "injoignable", "by": "TEST"},
        )
        assert r2.status_code == 400, f"should be blocked with only 1 call: {r2.status_code} {r2.text}"
    finally:
        _delete(headers, lead_id)


def test_injoignable_allowed_after_six_calls(headers, db):
    """Old lead with 6 pas_de_reponse calls: Injoignable allowed."""
    lead_id = _create_test_lead(headers)
    try:
        _make_old_untouched(db, lead_id)
        now = datetime.now(timezone.utc)
        attempts = [
            {"at": (now - timedelta(days=d)).isoformat(), "outcome": "pas_de_reponse",
             "message_laisse": False, "by": "TEST"}
            for d in range(6, 0, -1)
        ]
        db.demandes_devis.update_one(
            {"id": lead_id},
            {"$set": {"call_attempts": attempts, "status": "pas_de_reponse"}},
        )
        r = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
            headers=headers,
            json={"status": "client_perdu", "lost_reason_code": "injoignable", "by": "TEST"},
        )
        assert r.status_code == 200, f"should allow Injoignable with 6 pas_de_reponse: {r.status_code} {r.text}"
    finally:
        _delete(headers, lead_id)


# ---------- Regression: tracked lead still works ----------

def test_regression_tracked_new_lead_still_in_group2(headers):
    """Normal test lead (created_at >= tracking_since) must still appear as
    group 2 (nouveau) in to-call — the original tracked path is untouched."""
    lead_id = _create_test_lead(headers)
    try:
        items = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers,
                             params={"store": "test"}).json()
        ours = [i for i in items if i["id"] == lead_id]
        assert len(ours) == 1, "freshly created tracked lead should appear"
        assert ours[0]["group"] == 2, ours[0]
    finally:
        _delete(headers, lead_id)
