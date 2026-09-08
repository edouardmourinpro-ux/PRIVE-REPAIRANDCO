"""Backend tests for Béziers store closure guard on lead endpoints."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

CLOSED_MSG = "Ce magasin est temporairement fermé. Merci de choisir un autre magasin."


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def quote_payload(store):
    return {
        "device_type": "smartphone", "brand": "Apple", "model": "iPhone 12",
        "issue_types": ["Écran cassé"], "name": "TEST_User", "first_name": "TEST",
        "phone": "0600000000", "email": "TEST_beziers@example.com", "store": store,
    }


def buyback_payload(store):
    return {
        "brand": "Apple", "model": "iPhone 12", "condition": "Bon état",
        "name": "TEST_User", "first_name": "TEST", "phone": "0600000000", "store": store,
    }


def contact_payload(store):
    return {
        "name": "TEST_User", "first_name": "TEST", "email": "TEST_beziers@example.com",
        "phone": "0600000000", "subject": "Question", "message": "Test message",
        "store": store,
    }


# --- Béziers must be rejected on lead endpoints ---

def test_quote_beziers_rejected(client):
    r = client.post(f"{BASE_URL}/api/quote", json=quote_payload("beziers"))
    assert r.status_code == 400, r.text
    assert r.json().get("detail") == CLOSED_MSG


def test_buyback_beziers_rejected(client):
    r = client.post(f"{BASE_URL}/api/buyback", json=buyback_payload("beziers"))
    assert r.status_code == 400, r.text
    assert r.json().get("detail") == CLOSED_MSG


def test_contact_beziers_rejected(client):
    r = client.post(f"{BASE_URL}/api/contact", json=contact_payload("beziers"))
    assert r.status_code == 400, r.text
    assert r.json().get("detail") == CLOSED_MSG


# --- Non-regression: lattes (open) must succeed ---

def test_quote_lattes_succeeds(client):
    r = client.post(f"{BASE_URL}/api/quote", json=quote_payload("lattes"))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "success"
    assert isinstance(data.get("id"), str) and len(data["id"]) > 0


def test_buyback_lattes_succeeds(client):
    r = client.post(f"{BASE_URL}/api/buyback", json=buyback_payload("lattes"))
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "success"
    assert isinstance(data.get("id"), str) and len(data["id"]) > 0


def test_contact_without_store_succeeds(client):
    payload = contact_payload("lattes")
    payload.pop("store")
    r = client.post(f"{BASE_URL}/api/contact", json=payload)
    assert r.status_code == 200, r.text


# --- Sitemap non-regression ---

def test_sitemap_still_has_19_urls_incl_beziers():
    with open("/app/frontend/public/sitemap.xml") as f:
        content = f.read()
    assert content.count("<url>") == 19
    assert "magasins/beziers" in content
