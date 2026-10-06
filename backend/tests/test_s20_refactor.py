"""Backend regression tests for the S20 server-driven CRM refactor:
/call (statut direct + 4 questions pas_de_reponse), /passage, /phone,
/to-call (9 groupes), /transfo, et le bypass CRM du B2B.
Toutes les demandes créées ici utilisent le magasin technique "test" — jamais
"lattes" ni aucun magasin réel (aucun email/SMS réel n'est déclenché)."""
import os
from datetime import datetime, timedelta, timezone

import pytest
import requests


def _load_backend_url():
    val = os.environ.get("REACT_APP_BACKEND_URL")
    if val:
        return val.rstrip("/")
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


def _call(headers, lead_id, body, category="devis"):
    return requests.post(f"{BASE_URL}/api/admin/demandes/{category}/{lead_id}/call", headers=headers, json=body, timeout=15)


class TestCallPasDeReponse:
    def test_missing_question_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Mathilde", "outcome": "pas_de_reponse"})
            assert r.status_code == 400
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_no_without_raison_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {
                "by": "Mathilde", "outcome": "pas_de_reponse",
                "rappel_2e": False, "message_laisse": True, "mail_envoye": True, "message_envoye": True,
            })
            assert r.status_code == 400
            assert "raison" in r.json()["detail"].lower()
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_full_valid_sets_status_pas_de_reponse(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {
                "by": "Mathilde", "outcome": "pas_de_reponse",
                "rappel_2e": False, "rappel_2e_raison": "magasin plein, personne de libre",
                "message_laisse": False, "message_laisse_raison": "repondeur plein",
                "mail_envoye": False, "mail_envoye_raison": "pas d'adresse email",
                "message_envoye": False, "message_envoye_raison": "numero fixe, pas de WhatsApp",
            })
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "pas_de_reponse"
        finally:
            _delete_test_lead(headers, "devis", lead_id)


class TestCallJointDetails:
    def test_rdv_pris_requires_date_and_slot(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "rdv_pris"})
            assert r.status_code == 400
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "rdv_pris", "appt_date": "2026-10-06", "appt_slot": "bad"})
            assert r.status_code == 400
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_rdv_pris_valid_sets_status_and_appt_fields(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {
                "by": "Eren", "outcome": "joint", "detail": "rdv_pris",
                "appt_date": "2026-10-06", "appt_slot": "Après-midi (14h-17h)",
            })
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "rdv_pris"
            d = requests.get(f"{BASE_URL}/api/admin/demandes/devis?store=test", headers=headers, timeout=15).json()
            lead = next(x for x in d if x["id"] == lead_id)
            assert lead["appt_type"] == "rdv"
            assert lead["appt_slot"] == "Après-midi (14h-17h)"
            assert lead["appt_start_at"] and lead["appt_end_at"]
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_devis_accepte_requires_date_no_slot(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "devis_accepte", "appt_date": "2026-10-06"})
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "devis_accepte"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_vient_magasin_legacy_treated_as_devis_accepte(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "vient_magasin", "appt_date": "2026-10-06"})
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "devis_accepte"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_reflechit_defaults_callback_when_no_choice(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "reflechit"})
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "reflechit"
            d = requests.get(f"{BASE_URL}/api/admin/demandes/devis?store=test", headers=headers, timeout=15).json()
            lead = next(x for x in d if x["id"] == lead_id)
            assert lead["next_callback_at"]
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_refus_requires_valid_reason_and_sets_status(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "refus", "refus_reason": "bad"})
            assert r.status_code == 400
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "refus", "refus_reason": "prix"})
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "refus_devis"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_numero_invalide_sets_client_perdu(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "numero_invalide"})
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "client_perdu"
        finally:
            _delete_test_lead(headers, "devis", lead_id)


class TestPassage:
    def test_venu_facture_sets_status_facture(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/passage", headers=headers,
                              json={"by": "Eren", "venu": True, "facture": True}, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "facture"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_venu_non_facture_without_note_returns_400(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/passage", headers=headers,
                              json={"by": "Eren", "venu": True, "facture": False, "callback_choice": "demain_10h"}, timeout=15)
            assert r.status_code == 400
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_venu_non_facture_with_note_sets_a_rappeler(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/passage", headers=headers,
                              json={"by": "Eren", "venu": True, "facture": False, "note": "pas prêt à payer", "callback_choice": "demain_10h"}, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "a_rappeler"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_non_venu_requires_callback(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/passage", headers=headers,
                              json={"by": "Eren", "venu": False}, timeout=15)
            assert r.status_code == 400
            r = requests.post(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/passage", headers=headers,
                              json={"by": "Eren", "venu": False, "callback_choice": "18h"}, timeout=15)
            assert r.status_code == 200, r.text
            assert r.json()["new_status"] == "a_rappeler"
        finally:
            _delete_test_lead(headers, "devis", lead_id)


class TestPhone:
    def test_wrong_code_returns_403(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/phone", headers=headers,
                               json={"code": "BAD", "by": "Eren", "phone": "0611223344"}, timeout=15)
            assert r.status_code == 403
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_correct_code_updates_phone(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            r = requests.patch(f"{BASE_URL}/api/admin/demandes/devis/{lead_id}/phone", headers=headers,
                               json={"code": DELETE_CODE, "by": "Eren", "phone": "0611223344"}, timeout=15)
            assert r.status_code == 200, r.text
            d = requests.get(f"{BASE_URL}/api/admin/demandes/devis?store=test", headers=headers, timeout=15).json()
            lead = next(x for x in d if x["id"] == lead_id)
            assert lead["phone"] == "0611223344"
            assert lead["phone_changes"][-1]["new_phone"] == "0611223344"
        finally:
            _delete_test_lead(headers, "devis", lead_id)


class TestToCallGroups:
    def test_new_lead_is_group_2(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next(x for x in items if x["id"] == lead_id)
            assert item["group"] == 2 and item["section"] == "maintenant"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_overdue_callback_is_group_1(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            past = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "rappeler", "callback_choice": "custom", "callback_at": past})
            assert r.status_code == 200, r.text
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next(x for x in items if x["id"] == lead_id)
            assert item["group"] == 1 and item["section"] == "maintenant"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_six_unanswered_calls_is_group_4(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            for _ in range(6):
                r = _call(headers, lead_id, {
                    "by": "Eren", "outcome": "pas_de_reponse",
                    "rappel_2e": True, "message_laisse": True, "mail_envoye": True, "message_envoye": True,
                })
                assert r.status_code == 200, r.text
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next(x for x in items if x["id"] == lead_id)
            assert item["group"] == 4 and item["section"] == "a_classer"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_three_reflechit_calls_is_group_6(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            for _ in range(3):
                r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "reflechit"})
                assert r.status_code == 200, r.text
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next(x for x in items if x["id"] == lead_id)
            assert item["group"] == 6 and item["section"] == "a_classer"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_overdue_rdv_is_group_8(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "rdv_pris", "appt_date": yesterday, "appt_slot": "Matin (9h30-12h30)"})
            assert r.status_code == 200, r.text
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next(x for x in items if x["id"] == lead_id)
            assert item["group"] == 8 and item["section"] == "maintenant"
        finally:
            _delete_test_lead(headers, "devis", lead_id)

    def test_overdue_passage_is_group_7(self, headers):
        lead_id = _create_test_lead(headers)
        try:
            yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            r = _call(headers, lead_id, {"by": "Eren", "outcome": "joint", "detail": "devis_accepte", "appt_date": yesterday})
            assert r.status_code == 200, r.text
            items = requests.get(f"{BASE_URL}/api/admin/to-call?store=test", headers=headers, timeout=15).json()
            item = next(x for x in items if x["id"] == lead_id)
            assert item["group"] == 7 and item["section"] == "maintenant"
        finally:
            _delete_test_lead(headers, "devis", lead_id)


class TestTransfo:
    def test_transfo_shape(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/transfo", headers=headers, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["days"] == 30
        assert body["total"] >= body["facture"] >= 0
        assert 0 <= body["rate"] <= 100

    def test_transfo_store_test_scope(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/transfo?store=test", headers=headers, timeout=15)
        assert r.status_code == 200, r.text


class TestB2BBypassCRM:
    def test_entreprise_category_rejected_by_generic_crm_routes(self, headers):
        r = requests.get(f"{BASE_URL}/api/admin/demandes/entreprise", headers=headers, timeout=15)
        assert r.status_code == 400

    def test_b2b_submission_still_succeeds(self):
        r = requests.post(f"{BASE_URL}/api/b2b", json={
            "first_name": "Test", "last_name": "B2B", "company": "ACME Test",
            "email": "test-b2b@example.com", "phone": "0611223344", "fleet_size": "10-50",
        }, timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "success"
