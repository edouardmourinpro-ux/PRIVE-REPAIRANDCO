"""Tests for the /api/admin/to-call aggregation endpoint (S19)."""
import os
import time
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

PARIS_OFFSET_HOURS = 1  # winter; only used for label check tolerance


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "david.m@repairandco.fr",
        "password": "Repair2025Admin!",
    })
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def db():
    return MongoClient(MONGO_URL)[DB_NAME]


def _create_test_lead(headers, category="devis"):
    r = requests.post(
        f"{BASE_URL}/api/admin/notifications/test-lead",
        headers=headers,
        json={"category": category, "send_email": False, "send_sms": False},
    )
    assert r.status_code == 200, r.text
    return r.json()["id"]


def _delete(headers, category, lead_id):
    requests.request(
        "DELETE",
        f"{BASE_URL}/api/admin/demandes/{category}/{lead_id}",
        headers=headers,
        json={"code": DELETE_CODE},
    )


def test_to_call_endpoint_reachable(headers):
    r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_group2_nouveau_test_lead(headers):
    lead_id = _create_test_lead(headers, "devis")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        assert r.status_code == 200
        items = r.json()
        ours = [i for i in items if i["id"] == lead_id]
        assert len(ours) == 1, f"lead should appear in to-call list: {items}"
        it = ours[0]
        assert it["group"] == 2
        assert it["label"].startswith("Nouvelle demande, attend depuis")
        assert "min" in it["label"] or "h" in it["label"] or "jour" in it["label"]
        assert it["category"] == "devis"

        # Isolation: without store=test, must NOT appear
        r2 = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers)
        assert lead_id not in [i["id"] for i in r2.json()]
    finally:
        _delete(headers, "devis", lead_id)


def test_group1_rappel_pret(headers, db):
    lead_id = _create_test_lead(headers, "devis")
    try:
        past = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
        db.demandes_devis.update_one(
            {"id": lead_id},
            {"$set": {
                "call_attempts": [{
                    "at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
                    "outcome": "joint",
                    "detail": "rappeler",
                    "callback_at": past,
                    "by": "TEST",
                }],
                "status": "client_contacte",
            }}
        )
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        items = [i for i in r.json() if i["id"] == lead_id]
        assert len(items) == 1
        it = items[0]
        assert it["group"] == 1, it
        assert it["label"].startswith("Rappel prévu à "), it["label"]
        # HHhMM pattern
        import re
        assert re.search(r"Rappel prévu à \d{2}h\d{2}( \(en retard\))?$", it["label"]), it["label"]
    finally:
        _delete(headers, "devis", lead_id)


def test_group3_relance(headers, db):
    lead_id = _create_test_lead(headers, "devis")
    try:
        # Simulate 1 pas_de_reponse call from previous business day
        old = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        db.demandes_devis.update_one(
            {"id": lead_id},
            {"$set": {
                "call_attempts": [{
                    "at": old, "outcome": "pas_de_reponse",
                    "message_laisse": False, "by": "TEST",
                }],
                "status": "client_contacte",
            }}
        )
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        items = [i for i in r.json() if i["id"] == lead_id]
        assert len(items) == 1
        it = items[0]
        assert it["group"] == 3, it
        assert it["label"].startswith("2e appel (pas de réponse le "), it["label"]
    finally:
        _delete(headers, "devis", lead_id)


def test_group4_injoignable_ready(headers, db):
    lead_id = _create_test_lead(headers, "devis")
    try:
        now = datetime.now(timezone.utc)
        attempts = [
            {"at": (now - timedelta(days=3)).isoformat(), "outcome": "pas_de_reponse", "message_laisse": False, "by": "T"},
            {"at": (now - timedelta(days=2)).isoformat(), "outcome": "pas_de_reponse", "message_laisse": False, "by": "T"},
            {"at": (now - timedelta(days=1)).isoformat(), "outcome": "pas_de_reponse", "message_laisse": False, "by": "T"},
            {"at": (now - timedelta(hours=20)).isoformat(), "outcome": "pas_de_reponse", "message_laisse": False, "by": "T"},
            {"at": (now - timedelta(hours=10)).isoformat(), "outcome": "pas_de_reponse", "message_laisse": False, "by": "T"},
            {"at": (now - timedelta(hours=5)).isoformat(), "outcome": "pas_de_reponse", "message_laisse": False, "by": "T"},
        ]
        db.demandes_devis.update_one(
            {"id": lead_id},
            {"$set": {"call_attempts": attempts, "status": "client_contacte"}}
        )
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        items = [i for i in r.json() if i["id"] == lead_id]
        assert len(items) == 1
        it = items[0]
        assert it["group"] == 4, it
        assert it["label"] == "6 appels sans réponse", it["label"]

        # Now PATCH to client_perdu/injoignable
        r2 = requests.patch(
            f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/status",
            headers=headers,
            json={"status": "client_perdu", "lost_reason_code": "injoignable", "by": "TEST"},
        )
        assert r2.status_code == 200, r2.text
        r3 = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        assert lead_id not in [i["id"] for i in r3.json()], "should disappear after client_perdu"
    finally:
        _delete(headers, "devis", lead_id)


def test_non_callable_statuses_excluded(headers, db):
    lead_id = _create_test_lead(headers, "devis")
    try:
        db.demandes_devis.update_one({"id": lead_id}, {"$set": {"status": "pris_en_charge"}})
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        assert lead_id not in [i["id"] for i in r.json()]
    finally:
        _delete(headers, "devis", lead_id)


def test_pre_tracking_lead_excluded(headers, db):
    lead_id = _create_test_lead(headers, "devis")
    try:
        # Move created_at BEFORE tracking_since
        doc = db.demandes_devis.find_one({"id": lead_id})
        ts = doc.get("tracking_since")
        earlier = (datetime.fromisoformat(ts) - timedelta(days=10)).isoformat()
        db.demandes_devis.update_one({"id": lead_id}, {"$set": {"created_at": earlier}})
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "test"})
        assert lead_id not in [i["id"] for i in r.json()]
    finally:
        _delete(headers, "devis", lead_id)


def test_test_lead_excluded_when_no_store_filter(headers):
    lead_id = _create_test_lead(headers, "devis")
    try:
        r = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers)
        assert lead_id not in [i["id"] for i in r.json()]
        r2 = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, params={"store": "lattes"})
        assert lead_id not in [i["id"] for i in r2.json()]
    finally:
        _delete(headers, "devis", lead_id)


def test_demo_set_covers_every_section(headers):
    r = requests.post(f"{BASE_URL}/api/admin/notifications/demo-set", headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["created"] == 26
    items = requests.get(f"{BASE_URL}/api/admin/to-call", params={"store": "test"}, headers=headers, timeout=15).json()
    demo = [i for i in items if i.get("demo")]
    sections = {i["section"] for i in demo}
    assert {"maintenant", "a_classer"} <= sections
    assert any(i["group"] == 6 for i in demo)  # réfléchit toujours après 2 relances
    assert any(i["group"] == 4 for i in demo)  # 6 appels sans réponse
    assert any(i["group"] == 7 for i in demo)  # devis accepté il y a plus de 24 h
    assert any(i["group"] == 8 for i in demo)  # RDV passé
    assert {"devis", "contact", "rachat"} <= {i["category"] for i in demo}  # les 3 onglets
    # Jamais visibles sans le filtre Magasin TEST
    all_items = requests.get(f"{BASE_URL}/api/admin/to-call", headers=headers, timeout=15).json()
    assert not any(i.get("store") == "test" for i in all_items)


def test_transfo_rate_for_store(headers):
    requests.post(f"{BASE_URL}/api/admin/notifications/demo-set", headers=headers, timeout=15)
    r = requests.get(f"{BASE_URL}/api/admin/transfo", params={"store": "test"}, headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["days"] == 30
    assert body["facture"] >= 3 and body["total"] >= 26  # dont Test8, facturé
    assert body["rate"] == round(100 * body["facture"] / body["total"])
