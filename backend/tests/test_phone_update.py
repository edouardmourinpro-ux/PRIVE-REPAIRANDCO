"""Backend tests for PATCH /api/admin/demandes/{category}/{id}/phone endpoint.
Tests FR phone validation + auto-requeue when previously client_perdu/numero_invalide.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
DELETE_CODE = 'MOUR1'
ADMIN_EMAIL = 'david.m@repairandco.fr'
ADMIN_PASSWORD = 'Repair2025Admin!'


@pytest.fixture(scope='module')
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()['token']


@pytest.fixture(scope='module')
def headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope='module')
def test_demand(headers):
    """Create a TEST devis demand via admin API by POSTing a public devis then marking it store=test via DB? Use the public devis endpoint with store='test'."""
    payload = {
        "device_type": "Smartphone",
        "brand": "Apple",
        "model": "iPhone 12",
        "issue_types": ["ecran"],
        "name": "TEST PhoneUpdate",
        "first_name": "Tester",
        "email": "test_phone@example.com",
        "phone": "0612345678",
        "store": "test",
    }
    r = requests.post(f"{BASE_URL}/api/quote", json=payload)
    assert r.status_code in (200, 201), r.text
    return r.json()


def _get_demand(headers, demand_id):
    r = requests.get(f"{BASE_URL}/api/admin/demandes-devis", headers=headers)
    assert r.status_code == 200
    for d in r.json():
        if d['id'] == demand_id:
            return d
    return None


def test_phone_update_wrong_code(headers, test_demand):
    r = requests.patch(
        f"{BASE_URL}/api/admin/demandes/devis/{test_demand['id']}/phone",
        headers=headers,
        json={"code": "WRONG", "by": "tester", "phone": "0612345678"},
    )
    assert r.status_code == 403
    assert "Code de sécurité incorrect" in r.json().get('detail', '')


def test_phone_update_invalid_format(headers, test_demand):
    r = requests.patch(
        f"{BASE_URL}/api/admin/demandes/devis/{test_demand['id']}/phone",
        headers=headers,
        json={"code": DELETE_CODE, "by": "tester", "phone": "123"},
    )
    assert r.status_code == 400
    assert "invalide" in r.json().get('detail', '').lower()


def test_phone_update_valid_national(headers, test_demand):
    new_phone = "0699887766"
    r = requests.patch(
        f"{BASE_URL}/api/admin/demandes/devis/{test_demand['id']}/phone",
        headers=headers,
        json={"code": DELETE_CODE, "by": "tester", "phone": new_phone},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['status'] == 'updated'
    # Verify persistence
    doc = _get_demand(headers, test_demand['id'])
    assert doc is not None
    assert doc['phone'] == new_phone
    assert any(pc.get('new_phone') == new_phone for pc in doc.get('phone_changes', []))


def test_phone_update_valid_international(headers, test_demand):
    r = requests.patch(
        f"{BASE_URL}/api/admin/demandes/devis/{test_demand['id']}/phone",
        headers=headers,
        json={"code": DELETE_CODE, "by": "tester", "phone": "33612345678"},
    )
    assert r.status_code == 200, r.text


def test_phone_update_requeue_from_client_perdu(headers, test_demand):
    """If demand was client_perdu/numero_invalide, correcting the phone should set status=nouveau."""
    did = test_demand['id']
    # Set the demand to client_perdu with lost_reason_code=numero_invalide via call-log numero_invalide outcome
    r = requests.post(
        f"{BASE_URL}/api/admin/demandes/devis/{did}/call",
        headers=headers,
        json={"outcome": "numero_invalide", "by": "tester"},
    )
    assert r.status_code == 200, r.text
    doc = _get_demand(headers, did)
    assert doc['status'] == 'client_perdu'
    assert doc.get('lost_reason_code') == 'numero_invalide'

    # Now correct the phone
    r = requests.patch(
        f"{BASE_URL}/api/admin/demandes/devis/{did}/phone",
        headers=headers,
        json={"code": DELETE_CODE, "by": "tester", "phone": "0611112222"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data['new_status'] == 'nouveau'
    doc = _get_demand(headers, did)
    assert doc['status'] == 'nouveau'
    assert doc.get('lost_reason_code') in (None, '')


def test_phone_update_missing_by(headers, test_demand):
    r = requests.patch(
        f"{BASE_URL}/api/admin/demandes/devis/{test_demand['id']}/phone",
        headers=headers,
        json={"code": DELETE_CODE, "by": "", "phone": "0612345678"},
    )
    assert r.status_code == 400


def test_cleanup(headers, test_demand):
    """Delete the test demand."""
    r = requests.request(
        'DELETE',
        f"{BASE_URL}/api/admin/demandes/devis/{test_demand['id']}",
        headers=headers,
        json={"code": DELETE_CODE},
    )
    assert r.status_code == 200
