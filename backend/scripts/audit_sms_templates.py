"""Rapport à blanc des 4 SMS clients — AUCUN envoi réel.
Génère les 4 textes pour les 9 magasins et vérifie l'encodage GSM-7/UCS-2,
le nombre de segments, et si la formule de politesse finale a dû être
raccourcie/retirée pour tenir sous 160 caractères.
Run: python3 /app/backend/scripts/audit_sms_templates.py
"""
import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import (  # noqa: E402
    STORE_NAMES, _build_client_appt_sms, _store_address, _is_client_creation_daytime,
)

GSM7_SAFE = set(
    " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
    "éèàù\n"
)

def check_encoding(text: str):
    is_gsm7 = all(c in GSM7_SAFE for c in text)
    if is_gsm7:
        segments = 1 if len(text) <= 160 else -(-len(text) // 153)
        return "GSM-7", segments
    segments = 1 if len(text) <= 70 else -(-len(text) // 67)
    return "UCS-2", segments

STORES = [s for s in STORE_NAMES if s != "test"]
SAMPLE_DATE = (date.today() + timedelta(days=3)).strftime("%Y-%m-%d")
SAMPLE_SLOT = "Après-midi (14h-17h)"

print(f"Fenêtre creation actuelle (Paris) : {'JOUR (9h-18h)' if _is_client_creation_daytime() else 'HORS HORAIRES'}\n")

rows = [(store_id, STORE_NAMES[store_id], _store_address(store_id)) for store_id in STORES]

# Force les 2 variantes jour/hors-horaires indépendamment de l'heure réelle d'exécution
import server as srv  # noqa: E402

def build_creation(store_id: str, force_daytime: bool) -> str:
    orig = srv._is_client_creation_daytime
    srv._is_client_creation_daytime = lambda now_paris=None: force_daytime
    try:
        return srv._build_client_creation_sms(store_id)
    finally:
        srv._is_client_creation_daytime = orig

total_warnings = 0
for store_id, store_name, address in rows:
    print("=" * 90)
    print(f"{store_name} ({store_id})  —  adresse SMS: {address or '(aucune)'}")
    print("=" * 90)
    templates = {
        "Confirmation jour": build_creation(store_id, True),
        "Confirmation hors horaires": build_creation(store_id, False),
        "RDV avec créneau": _build_client_appt_sms("rdv", SAMPLE_DATE, SAMPLE_SLOT, store_name, address),
        "Passage sans créneau": _build_client_appt_sms("passage", SAMPLE_DATE, None, store_name, address),
    }
    for label, text in templates.items():
        enc, seg = check_encoding(text)
        warn = []
        if enc == "UCS-2":
            warn.append("UCS-2 !!")
        if len(text) > 160:
            warn.append(f">160 car. ({len(text)}) — formule finale non retirable sans couper magasin/adresse/tel/date")
        if seg > 1:
            warn.append(f"{seg} segments")
        if text.endswith("Restez joignable !"):
            warn.append("formule raccourcie (160 dépassé avec la formule longue)")
        warn_str = f"   ⚠ {' / '.join(warn)}" if warn else ""
        if warn:
            total_warnings += 1
        print(f"- {label} [{len(text)} car. | {enc} | {seg} seg.]{warn_str}")
        print(f"    \"{text}\"")
    print()

print(f"Total avertissements : {total_warnings}")
