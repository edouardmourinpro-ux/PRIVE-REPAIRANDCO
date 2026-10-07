"""Seed Magasin TEST demo leads covering all 9 /admin/to-call groups (S22 UI demo).
Run manually: python3 /app/backend/scripts/seed_demo_to_call.py
Uses the public admin API + a few direct Mongo backdates (call timestamp only,
to simulate "3h ouvrées sans réponse" — the API always timestamps 'now')."""
import os
import sys
import time
from datetime import datetime, timedelta, timezone

import requests
from pymongo import MongoClient
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

with open("/app/frontend/.env") as f:
    API_URL = next(l.split("=", 1)[1].strip() for l in f if l.startswith("REACT_APP_BACKEND_URL="))

with open("/app/backend/.env") as f:
    env = dict(l.strip().split("=", 1) for l in f if "=" in l and not l.startswith("#"))
MONGO_URL = env["MONGO_URL"].strip('"')
DB_NAME = env["DB_NAME"].strip('"')

mongo = MongoClient(MONGO_URL)[DB_NAME]
PARIS = ZoneInfo("Europe/Paris")

r = requests.post(f"{API_URL}/api/auth/login", json={"email": "david.m@repairandco.fr", "password": "Repair2025Admin!"})
r.raise_for_status()
TOKEN = r.json()["token"]
H = {"Authorization": f"Bearer {TOKEN}"}


def create_lead():
    r = requests.post(f"{API_URL}/api/admin/notifications/test-lead", headers=H,
                      json={"category": "devis", "same_person": False, "accelerated": False})
    r.raise_for_status()
    return r.json()["id"]


def call(lead_id, payload):
    r = requests.post(f"{API_URL}/api/admin/demandes/devis/{lead_id}/call", headers=H, json=payload)
    if r.status_code != 200:
        print("  CALL FAILED", r.status_code, r.text)
    return r


print("Nettoyage des anciens leads TEST...")
existing = requests.get(f"{API_URL}/api/admin/demandes/devis?store=test", headers=H).json()
for d in existing:
    requests.delete(f"{API_URL}/api/admin/demandes/devis/{d['id']}", headers=H, json={"code": "MOUR1"})
print(f"  {len(existing)} supprimés")

now_paris = datetime.now(PARIS)

print("Groupe 2 — nouvelle demande")
create_lead()

print("Groupe 1 — rappel dû (heure passée)")
lead = create_lead()
past = (datetime.now(timezone.utc) - timedelta(minutes=20)).isoformat()
call(lead, {"by": "Démo", "outcome": "joint", "detail": "rappeler", "callback_choice": "custom", "callback_at": past})

print("Groupe 5 — rappel plus tard aujourd'hui")
lead = create_lead()
later_today_paris = now_paris.replace(hour=23, minute=0, second=0, microsecond=0)
if later_today_paris <= now_paris:
    later_today_paris = now_paris + timedelta(hours=1)
later_today_utc = later_today_paris.astimezone(timezone.utc).isoformat()
call(lead, {"by": "Démo", "outcome": "joint", "detail": "rappeler", "callback_choice": "custom", "callback_at": later_today_utc})

print("Groupe 3 — relance (3h ouvrées sans réponse)")
lead = create_lead()
call(lead, {"by": "Démo", "outcome": "pas_de_reponse", "rappel_2e": True, "message_laisse": True, "mail_envoye": True, "message_envoye": True})
old_at = (now_paris - timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0).astimezone(timezone.utc).isoformat()
mongo.demandes_devis.update_one({"id": lead}, {"$set": {"call_attempts.0.at": old_at}})

print("Groupe 4 — 6 appels sans réponse (à classer)")
lead = create_lead()
for _ in range(6):
    call(lead, {"by": "Démo", "outcome": "pas_de_reponse", "rappel_2e": True, "message_laisse": True, "mail_envoye": True, "message_envoye": True})

print("Groupe 6 — réfléchit x3 (à classer)")
lead = create_lead()
for _ in range(3):
    call(lead, {"by": "Démo", "outcome": "joint", "detail": "reflechit"})

print("Groupe 7 — passage sans RDV dépassé")
lead = create_lead()
yesterday = (now_paris - timedelta(days=1)).strftime("%Y-%m-%d")
call(lead, {"by": "Démo", "outcome": "joint", "detail": "devis_accepte", "appt_date": yesterday})

print("Groupe 8 — RDV dépassé")
lead = create_lead()
call(lead, {"by": "Démo", "outcome": "joint", "detail": "rdv_pris", "appt_date": yesterday, "appt_slot": "Matin (9h30-12h30)"})

print("Groupe 9 — RDV aujourd'hui (pas encore dû)")
lead = create_lead()
today = now_paris.strftime("%Y-%m-%d")
if now_paris.hour < 17:
    slot = "Fin de journée (17h-19h30)"
elif now_paris.hour < 19:
    slot = "Fin de journée (17h-19h30)"
else:
    slot = None
if slot:
    call(lead, {"by": "Démo", "outcome": "joint", "detail": "rdv_pris", "appt_date": today, "appt_slot": slot})
else:
    call(lead, {"by": "Démo", "outcome": "joint", "detail": "devis_accepte", "appt_date": today})

print("\nTerminé. Rafraîchissez /admin > À appeler > Magasin TEST.")
