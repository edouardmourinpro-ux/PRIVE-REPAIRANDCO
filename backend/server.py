from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
import csv
import io
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import smtplib
import ssl
import requests as http_requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
import bcrypt
import jwt
import unicodedata
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from hiboutik_sync import sync_lead_to_hiboutik

PARIS_TZ = ZoneInfo("Europe/Paris")


async def _sync_and_persist(collection_name: str, demand_id: str, **kwargs) -> None:
    """Crée le client Hiboutik puis stocke le customers_id dans le doc MongoDB."""
    customer_id = await sync_lead_to_hiboutik(**kwargs)
    if customer_id:
        try:
            await db[collection_name].update_one(
                {"id": demand_id},
                {"$set": {"hiboutik_customer_id": customer_id}},
            )
        except Exception as e:
            logger.error(f"Failed to persist hiboutik_customer_id ({collection_name}/{demand_id}): {e}")
# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# SMTP config
SMTP_HOST = os.environ.get('SMTP_HOST')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '465'))
SMTP_USER = os.environ.get('SMTP_USER')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD')
NOTIFY_EMAIL = os.environ.get('NOTIFY_EMAIL')

# JWT config
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

# Admin config
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@repair-and-co.fr')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
DELETE_CODE = os.environ.get('DELETE_CODE', 'MOUR1')

# SMS via Brevo — https://api.brevo.com/v3/transactionalSMS/send
BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
# Expediteur : charte af2m (France, depuis le 01/03/2026) = 11 caracteres max,
# strictement alphanumeriques. Pas d'espace, pas de tiret, PAS de "&".
# "Repair&Co" serait refuse par les operateurs ; "RepairCo" est conforme.
SMS_SENDER = os.environ.get('SMS_SENDER', 'RepairCo')
# Interrupteur : reste a "false" tant que l'expediteur n'est pas valide par les
# operateurs. Quand false, on n'essaie meme pas d'envoyer le SMS et on ne le
# compte PAS comme un echec — sinon le digest quotidien crie a la panne tous les
# matins pour une cause connue, et l'alerte perd toute credibilite.
SMS_ENABLED = os.environ.get('SMS_ENABLED', 'false').lower() == 'true'
# Destinataires des alertes de supervision (pannes, escalades finales)
SUPERVISION_EMAIL = os.environ.get('SUPERVISION_EMAIL', '')

# Destinataire PRIMAIRE du SMS : le mobile du magasin, un seul responsable par lead.
# RÈGLE : uniquement des mobiles francais (33 6.. ou 33 7..).
# Un SMS vers une ligne fixe n'est JAMAIS delivre — c'est pour ca que les
# numeros publics des magasins (04/09/01) sont absents de cette table.
STORE_PRIMARY_SMS = {
    "lattes":           "33788809386",
    "montpellier-nord": "33647908879",  # Elisa
    "montpellier-sud":  "33623371642",  # TODO: RPV Laurence en attendant la creation du mobile magasin
    "nimes-costieres":  "33757532389",
    "nimes-etoile":     "33671835831",  # TODO: RPV Charlotte en attendant la creation du mobile magasin
    "beziers":          "33757528256",  # magasin ferme pour travaux — configure pour la reouverture
    "boulogne":         "33767118896",
    "plaisir":          "33660713422",  # Eren : Plaisir n'a pas de mobile propre
    "les-ulis":         "33749952472",
}

# Destinataire d'ESCALADE : le RPV, prevenu seulement si le lead n'est pas pris en charge.
STORE_ESCALATION_SMS = {
    "lattes":           "33695661867",  # Mathilde
    "montpellier-nord": "33663955650",  # Aurelie
    "montpellier-sud":  "33623371642",  # Laurence
    "nimes-costieres":  "33671835831",  # Charlotte
    "nimes-etoile":     "33671835831",  # Charlotte
    "beziers":          "33685319758",  # Mickael
    "boulogne":         "33660713422",  # Eren
    "plaisir":          "33660713422",  # Eren
    "les-ulis":         "33660713422",  # Eren
}

# Per-store manager email — added as an extra recipient on every new lead
# email (Devis / Contact / Rachat) so managers stay in the loop even without
# SMS. Same keys as STORE_PRIMARY_SMS / STORE_NAMES.
STORE_EMAIL = {
    "lattes":           "lattes@repair-and-co.fr",
    "montpellier-nord": "montpellier.nord@repair-and-co.fr",
    "montpellier-sud":  "montpellier.sud@repair-and-co.fr",
    "nimes-costieres":  "nimes.costieres@repair-and-co.fr",
    "nimes-etoile":     "nimes.etoile@repair-and-co.fr",
    "beziers":          "beziers@repair-and-co.fr",
    "boulogne":         "boulogne@repair-and-co.fr",
    "plaisir":          "plaisir@repair-and-co.fr",
    "les-ulis":         "les.ulis@repair-and-co.fr",
}

# Destinataires du MODE TEST — jamais dérangés : magasins, RPV, David.
TEST_RECIPIENT_EMAIL = os.environ.get('TEST_RECIPIENT_EMAIL', '')
TEST_RECIPIENT_SMS = os.environ.get('TEST_RECIPIENT_SMS', '')

STORE_NAMES = {
    "lattes": "Lattes",
    "montpellier-nord": "Montpellier Nord",
    "montpellier-sud": "Montpellier Sud",
    "nimes-costieres": "Nîmes Costières",
    "nimes-etoile": "Nîmes Étoile",
    "beziers": "Béziers",
    "boulogne": "Boulogne",
    "plaisir": "Plaisir",
    "les-ulis": "Les Ulis",
    "test": "Magasin TEST",
}

# Magasins qui n'acceptent pas de demande (fermés / en travaux) + magasin technique de test.
# Doit rester aligné avec acceptsLeads dans frontend/src/data/stores.js.
CLOSED_STORES = {"beziers"}
# Magasin technique réservé au mode test admin — jamais accessible via un formulaire public.
TEST_STORE_ID = "test"
PUBLIC_BLOCKED_STORES = CLOSED_STORES | {TEST_STORE_ID}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Repair & Co API")
api_router = APIRouter(prefix="/api")


# ==================== AUTH ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.admin_users.find_one({"email": payload["email"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expiré")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide")

async def seed_admin():
    existing = await db.admin_users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.admin_users.insert_one({
            "email": ADMIN_EMAIL, "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.admin_users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logger.info(f"Admin password updated: {ADMIN_EMAIL}")


# ==================== EMAIL ====================

def extra_recipients_for_store(store_id):
    """Return the manager email(s) for a given store id — empty list if unknown."""
    if not store_id:
        return []
    email = STORE_EMAIL.get(store_id)
    return [email] if email else []

def _send_smtp_email_raw(subject: str, html_body: str, recipients: list):
    """Low-level SMTP send to an EXACT, fully-resolved recipient list — no
    implicit NOTIFY_EMAIL injection. Used by send_email_tracked() so test-mode
    leads never leak to real staff/admin addresses."""
    if not recipients:
        logger.error("[EMAIL] Aucun destinataire fourni — email non envoyé.")
        return
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context, timeout=10) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, recipients, msg.as_string())
    logger.info(f"[EMAIL] Envoi OK → {recipients}")

def _send_smtp_email(subject: str, html_body: str, extra_recipients=None):
    raw = NOTIFY_EMAIL or ""
    recipients = [e.strip() for e in raw.split(',') if e.strip()]
    if extra_recipients:
        for addr in extra_recipients:
            a = (addr or "").strip()
            if a and a not in recipients:
                recipients.append(a)
    logger.info(f"[EMAIL] NOTIFY_EMAIL raw='{raw}' + extra={extra_recipients or []} → recipients={recipients} | subject='{subject}'")
    _send_smtp_email_raw(subject, html_body, recipients)

async def send_notification(subject: str, html_body: str, extra_recipients=None):
    try:
        await asyncio.to_thread(_send_smtp_email, subject, html_body, extra_recipients)
    except Exception as e:
        logger.error(f"[EMAIL] Échec SMTP — sujet='{subject}' erreur={e}")

def build_email_html(*, title: str, demand_type: str, store_name: str, client: dict,
                     details: dict, submitted_at: str, demand_id: str,
                     survey: dict = None, header_note: str = None,
                     action_note: str = "Action requise : appeler le client dans les 15 minutes.") -> str:
    """Rich HTML email template (Repair&Co branding).

    Sections: header (green) → meta (type/magasin/date) → client info → details → optional survey → CTA admin.
    """

    def _row(label, value):
        if value in (None, "", []):
            return ""
        if isinstance(value, list):
            value = ", ".join(str(v) for v in value)
        return (
            f'<tr>'
            f'<td style="padding:8px 14px;font-weight:600;color:#1A5C3A;vertical-align:top;white-space:nowrap;width:35%">{label}</td>'
            f'<td style="padding:8px 14px;color:#1A1A2E;word-break:break-word">{value}</td>'
            f'</tr>'
        )

    def _section(title_, rows_html):
        if not rows_html.strip():
            return ""
        return (
            f'<div style="margin:0 0 18px 0">'
            f'<h2 style="font-size:13px;color:#1A5C3A;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px 0;padding:0 14px">{title_}</h2>'
            f'<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E8F5EE;border-radius:10px;overflow:hidden">{rows_html}</table>'
            f'</div>'
        )

    meta_rows = _row("Type de demande", demand_type) + _row("Magasin", store_name) + _row("Soumis le", submitted_at)
    client_rows = "".join(_row(k, v) for k, v in client.items())
    details_rows = "".join(_row(k, v) for k, v in details.items())

    survey_block = ""
    if survey:
        survey_rows = "".join(_row(k, v) for k, v in survey.items() if v)
        survey_block = _section("Mini-enquête client", survey_rows)

    note_block = (
        f'<p style="margin:0 0 18px 0;padding:12px 14px;background:#E8F5EE;border-left:3px solid #2ECC71;color:#1A5C3A;font-size:13px;border-radius:6px">{header_note}</p>'
        if header_note else ""
    )

    return f"""
<div style="background:#f6f6f6;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.04)">
    <div style="background:#1A5C3A;padding:22px 24px">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">Repair&amp;Co</h1>
      <p style="color:#E8F5EE;margin:4px 0 0 0;font-size:14px">{title}</p>
    </div>
    <div style="padding:22px 14px 8px 14px">
      {note_block}
      {_section("Informations", meta_rows)}
      {_section("Client", client_rows)}
      {_section("Détails de la demande", details_rows)}
      {survey_block}
      <div style="text-align:center;margin:8px 0 4px 0">
        <a href="https://repairandco.fr/admin"
           style="display:inline-block;background:#1A5C3A;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:999px">
          Ouvrir dans /admin
        </a>
      </div>
      <p style="color:#1A1A2E;font-size:12px;text-align:center;margin:14px 0 0 0;opacity:.6">
        {action_note}
      </p>
    </div>
    <div style="background:#E8F5EE;padding:12px 16px;text-align:center">
      <p style="color:#1A5C3A;font-size:11px;margin:0">Email automatique — Repair&amp;Co — repairandco.fr</p>
    </div>
  </div>
</div>"""


CONDITION_LABELS = {"bon": "Bon état", "moyen": "État moyen", "abime": "Abîmé"}
SOURCE_LABELS = {
    "google": "Google",
    "reseaux_sociaux": "Réseaux sociaux",
    "bouche_a_oreille": "Bouche à oreille",
    "passage_magasin": "En passant devant le magasin",
    "autre": "Autre",
}


# ==================== SMS (Brevo) ====================

def _is_french_mobile(number: str) -> bool:
    """Only 33 6.. / 33 7.. mobiles are ever SMS-deliverable — landlines are not."""
    return (number or "").startswith(("336", "337"))

def _strip_accents(text: str) -> str:
    """SMS content must be pure ASCII — any accent flips encoding to UCS-2 and
    drops the segment limit from 160 to 70 characters."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))

def _is_business_hours(now_paris: datetime = None) -> bool:
    now_paris = now_paris or datetime.now(PARIS_TZ)
    return 9 <= now_paris.hour < 20

def build_sms_text(doc: dict, category: str, prefix: str = "") -> str:
    """Build an ASCII, <=160-char SMS body from a lead document."""
    store_name = STORE_NAMES.get(doc.get('store'), doc.get('store') or '')
    name = (
        doc.get('name')
        or " ".join(x for x in [doc.get('first_name'), doc.get('last_name')] if x).strip()
        or doc.get('company')
        or 'Client'
    )
    phone = doc.get('phone') or ''
    label = {"devis": "Devis", "contact": "RDV/Contact", "entreprise": "Entreprise", "rachat": "Rachat"}.get(category, category)
    if category == 'devis':
        extra = " ".join(x for x in [doc.get('brand'), doc.get('model')] if x)
        issues = doc.get('issue_types') or []
        if issues:
            extra = f"{extra} / {issues[0]}".strip(' /')
    elif category == 'rachat':
        extra = " ".join(x for x in [doc.get('brand'), doc.get('model')] if x)
    elif category == 'contact':
        extra = doc.get('subject') or ''
    elif category == 'entreprise':
        extra = doc.get('company') or ''
    else:
        extra = ''
    lines = ([prefix] if prefix else []) + [
        f"Repair&Co - NOUVEAU LEAD {label}",
        f"{store_name} - {name}".strip(' -'),
        phone,
        extra,
        "repairandco.fr/admin",
    ]
    text = _strip_accents("\n".join(l for l in lines if l))
    return text[:157] + "..." if len(text) > 160 else text

def _brevo_send_sms_sync(to_number: str, message: str) -> dict:
    """Single Brevo Transactional SMS call — raises on any non-success."""
    url = "https://api.brevo.com/v3/transactionalSMS/send"
    headers = {"api-key": BREVO_API_KEY, "content-type": "application/json"}
    payload = {"sender": SMS_SENDER, "recipient": to_number, "content": message, "type": "transactional"}
    resp = http_requests.post(url, json=payload, headers=headers, timeout=15)
    try:
        data = resp.json()
    except Exception:
        data = {}
    if resp.status_code < 200 or resp.status_code >= 300 or not data.get("messageId"):
        raise Exception(f"Brevo HTTP {resp.status_code}: {data}")
    return data

async def send_sms(to_number: str, message: str, kind: str = "primary") -> Optional[dict]:
    """Send one SMS via Brevo, retrying up to 3 times (immediate, +5s, +15s).
    Returns a notifications[] entry — never raises. Returns None if SMS is
    globally disabled (SMS_ENABLED=false), so it is never logged/counted."""
    if not SMS_ENABLED:
        return None
    entry = {"channel": "sms", "kind": kind, "to": to_number, "status": "failed", "attempts": 0}
    if not _is_french_mobile(to_number):
        entry["attempts"] = 1
        entry["error"] = "numero non mobile"
        entry["at"] = datetime.now(timezone.utc).isoformat()
        return entry
    last_error = None
    for i, delay in enumerate([0, 5, 15]):
        if delay:
            await asyncio.sleep(delay)
        entry["attempts"] = i + 1
        try:
            result = await asyncio.to_thread(_brevo_send_sms_sync, to_number, message)
            entry["status"] = "sent"
            entry["provider_id"] = result.get("messageId")
            entry["at"] = datetime.now(timezone.utc).isoformat()
            return entry
        except Exception as e:
            last_error = str(e)[:300]
    entry["error"] = last_error
    entry["at"] = datetime.now(timezone.utc).isoformat()
    return entry

async def send_email_tracked(to_addresses: str, subject: str, html_body: str, kind: str = "primary") -> Optional[dict]:
    """Send one email via SMTP, retrying up to 3 times, to the EXACT recipient
    list given (no implicit NOTIFY_EMAIL injection). Returns a
    notifications[] entry — never raises."""
    if not to_addresses:
        return None
    entry = {"channel": "email", "kind": kind, "to": to_addresses, "status": "failed", "attempts": 0}
    recipients = [a.strip() for a in to_addresses.split(',') if a.strip()]
    last_error = None
    for i, delay in enumerate([0, 5, 15]):
        if delay:
            await asyncio.sleep(delay)
        entry["attempts"] = i + 1
        try:
            await asyncio.to_thread(_send_smtp_email_raw, subject, html_body, recipients)
            entry["status"] = "sent"
            entry["at"] = datetime.now(timezone.utc).isoformat()
            return entry
        except Exception as e:
            last_error = str(e)[:300]
    entry["error"] = last_error
    entry["at"] = datetime.now(timezone.utc).isoformat()
    return entry

B2B_EMAIL = os.environ.get('B2B_EMAIL', 'david.m@repairandco.fr')
CLIENT_SMS_ENABLED = os.environ.get('CLIENT_SMS_ENABLED', 'false').lower() == 'true'
STORE_INFO = {
    "lattes": {
        "location": "CC Carrefour Grand Sud (Entrée 2)",
        "address": "Av. Georges Frêche",
        "city": "Lattes",
        "phone": "07 88 80 93 86"
    },
    "montpellier-nord": {
        "location": "CC Carrefour Trifontaine",
        "address": "Route de Ganges",
        "city": "Saint Clément de Rivière",
        "phone": "09 87 13 68 93"
    },
    "montpellier-sud": {
        "location": "CC Intermarché près d'Arènes",
        "address": "Av. Mas d'Argelliers",
        "city": "Montpellier",
        "phone": "04 67 58 81 39"
    },
    "nimes-costieres": {
        "location": "Shop Park Nîmes Costières",
        "address": "400 Av. Dr Baillet",
        "city": "Nîmes",
        "phone": "07 57 53 23 89"
    },
    "nimes-etoile": {
        "location": "CC Carrefour Nîmes Étoile",
        "address": "116 Rue André Dupont",
        "city": "Nîmes",
        "phone": "04 66 84 80 79"
    },
    "beziers": {
        "location": "",
        "address": "12 Allées Paul Riquet",
        "city": "Béziers",
        "phone": "04 67 94 30 34"
    },
    "boulogne": {
        "location": "CC Les Passages",
        "address": "5 Rue Tony Garnier",
        "city": "Boulogne-Billancourt",
        "phone": "07 67 11 88 96"
    },
    "plaisir": {
        "location": "CC Aushopping Grand Plaisir",
        "address": "CD 161",
        "city": "Plaisir",
        "phone": "01 30 43 89 07"
    },
    "les-ulis": {
        "location": "CC Ulis 2",
        "address": "Av. de l'Aubrac",
        "city": "Les Ulis",
        "phone": "07 49 95 24 72"
    }
}
RDV_SLOTS = {"9h-12h": (9, 12), "12h-14h": (12, 14), "14h-17h": (14, 17), "17h-20h": (17, 20)}
WEEKDAYS_FR = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]

def _format_paris_day(dt: datetime) -> str:
    d = dt.astimezone(PARIS_TZ)
    return f"{WEEKDAYS_FR[d.weekday()]} {d.strftime('%d/%m')}"

def _rdv_bounds(rdv_date: str, slot: str):
    start_h, end_h = RDV_SLOTS[slot]
    day = datetime.strptime(rdv_date, "%Y-%m-%d")
    return (day.replace(hour=start_h, tzinfo=PARIS_TZ).astimezone(timezone.utc),
            day.replace(hour=end_h, tzinfo=PARIS_TZ).astimezone(timezone.utc))

def _to_e164_fr(phone: str) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("0033"):
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 10:
        return "33" + digits[1:]
    return digits

def _client_sms_text(doc: dict, kind: str) -> str:
    store_id = doc.get("store")
    store = STORE_NAMES.get(store_id, "")
    if kind == "rdv":
        where = (STORE_INFO.get(store_id) or {}).get("location") or (STORE_INFO.get(store_id) or {}).get("address") or ""
        day = _format_paris_day(datetime.fromisoformat(doc["appt_start_at"]))
        text = f"Repair&Co : votre RDV est confirme le {day} ({doc.get('appt_slot')}) au magasin de {store}" + (f", {where}" if where else "") + ". A bientot !"
    else:
        now_p = datetime.now(PARIS_TZ)
        when = "aujourd'hui" if (now_p.weekday() < 6 and 9 <= now_p.hour < 18) else "des l'ouverture a 9h"
        text = f"Repair&Co : demande bien recue. Le magasin de {store} vous rappelle {when}. Merci de garder votre telephone a portee."
    text = _strip_accents(text)
    return text[:157] + "..." if len(text) > 160 else text

async def _send_client_sms(collection_name: str, demand_id: str, doc: dict, kind: str) -> None:
    """SMS au client : confirmation de la demande, ou du RDV. Rangé à part
    (client_sms) : n'entre jamais dans la pastille d'alerte du magasin."""
    if not (SMS_ENABLED and CLIENT_SMS_ENABLED) or doc.get("type") == "entreprise":
        return
    to = TEST_RECIPIENT_SMS if doc.get("is_test") else _to_e164_fr(doc.get("phone"))
    if not to or not _is_french_mobile(to):
        return
    now_iso = datetime.now(timezone.utc).isoformat()
    if kind == "confirmation":
        since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        if await db.client_sms_log.find_one({"phone": to, "kind": kind, "at": {"$gte": since}}):
            return
    await db.client_sms_log.insert_one({"phone": to, "kind": kind, "at": now_iso, "demand_id": demand_id})
    entry = await send_sms(to, _client_sms_text(doc, kind), kind=f"client_{kind}")
    if entry:
        await db[collection_name].update_one({"id": demand_id}, {"$push": {"client_sms": entry}})

async def _notify_b2b(collection_name: str, demand_id: str, store_id: str, subject: str, html_body: str, doc: dict, category: str) -> None:
    """Demande Entreprise : un seul email, à David (B2B_EMAIL). Aucun magasin, aucun SMS."""
    entry = await send_email_tracked(B2B_EMAIL, subject, html_body, kind="primary")
    notifications = [entry] if entry else []
    status = "ok" if entry and entry.get("status") == "sent" else "failed"
    await db[collection_name].update_one({"id": demand_id}, {"$set": {"notifications": notifications, "notify_status": status}})

def compute_notify_status(notifications: list) -> str:
    email_ok = any(n['channel'] == 'email' and n['status'] == 'sent' for n in notifications)
    if not SMS_ENABLED:
        return 'ok' if email_ok else 'failed'
    sms_primary = [n for n in notifications if n['channel'] == 'sms' and n['kind'] == 'primary']
    sms_ok = any(n['status'] == 'sent' for n in sms_primary)
    if email_ok and sms_ok:
        return 'ok'
    if email_ok or sms_ok:
        return 'partial'
    return 'failed'

async def _notify_lead(collection_name: str, demand_id: str, store_id: str, subject: str, html_body: str, doc: dict, category: str) -> None:
    """Background task: send email (NOTIFY_EMAIL + store manager) and primary
    SMS (store mobile), then persist the result on the lead document itself.
    The HTTP response of the form never waits for this.
    Test leads (is_test=True) are always routed to TEST_RECIPIENT_* only —
    never to a store, NOTIFY_EMAIL or SUPERVISION_EMAIL."""
    is_test = bool(doc.get('is_test'))
    notifications = []
    if is_test:
        recipients = [TEST_RECIPIENT_EMAIL] if TEST_RECIPIENT_EMAIL else []
    else:
        recipients = [e.strip() for e in (NOTIFY_EMAIL or "").split(',') if e.strip()]
        for addr in extra_recipients_for_store(store_id):
            if addr and addr not in recipients:
                recipients.append(addr)
    if recipients:
        email_entry = await send_email_tracked(", ".join(recipients), subject, html_body, kind="primary")
        if email_entry:
            notifications.append(email_entry)
    primary_number = TEST_RECIPIENT_SMS if is_test else (STORE_PRIMARY_SMS.get(store_id) if store_id else None)
    if primary_number:
        sms_entry = await send_sms(primary_number, build_sms_text(doc, category), kind="primary")
        if sms_entry:
            notifications.append(sms_entry)
    notify_status = compute_notify_status(notifications)
    try:
        await db[collection_name].update_one(
            {"id": demand_id},
            {"$push": {"notifications": {"$each": notifications}}, "$set": {"notify_status": notify_status}},
        )
    except Exception as e:
        logger.error(f"[NOTIFY] Failed to persist notification result ({collection_name}/{demand_id}): {e}")

def format_dt_fr(dt: datetime) -> str:
    """Any datetime formatted in the French Paris timezone (DST-aware)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PARIS_TZ).strftime("%d/%m/%Y à %Hh%M")

def format_now_fr():
    """Current datetime formatted in French timezone."""
    return format_dt_fr(datetime.now(timezone.utc))


# ==================== MODELS ====================

class QuoteRequestCreate(BaseModel):
    device_type: str
    brand: str
    model: str
    issue_types: List[str]
    other_issue: Optional[str] = None
    first_name: Optional[str] = None
    name: str
    phone: str
    email: EmailStr
    store: str
    preferred_time: Optional[str] = None

class ContactRequestCreate(BaseModel):
    first_name: Optional[str] = None
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    store: Optional[str] = None
    message: str
    # Optional structured fields used by the RDV (appointment) form:
    rdv_device_type: Optional[str] = None
    rdv_brand: Optional[str] = None
    rdv_model: Optional[str] = None
    rdv_issue: Optional[str] = None
    rdv_date: Optional[str] = None
    rdv_slot: Optional[str] = None

class B2BRequestCreate(BaseModel):
    first_name: str
    last_name: str
    company: str
    email: EmailStr
    phone: str
    fleet_size: str
    need_type: Optional[str] = None
    message: Optional[str] = None
    store: Optional[str] = None

class BuybackRequestCreate(BaseModel):
    brand: str
    model: str
    condition: str
    first_name: Optional[str] = None
    name: str
    phone: str
    store: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateStatusRequest(BaseModel):
    status: str
    by: str
    lost_reason: Optional[str] = None
    lost_reason_code: Optional[str] = None

class CustomerSurveyRequest(BaseModel):
    customer_source: Optional[str] = None
    customer_feedback: Optional[str] = None

class DeleteRequest(BaseModel):
    code: str

class StaffFeedbackRequest(BaseModel):
    staff_source: Optional[str] = None
    staff_site_opinion: Optional[str] = None
    staff_dislikes: Optional[str] = None

class QuotedPriceRequest(BaseModel):
    quoted_price: str = ""

class CallLogRequest(BaseModel):
    by: str
    outcome: str  # joint | pas_de_reponse | numero_invalide
    detail: Optional[str] = None  # rdv_pris | vient_magasin | devis_accepte | rappeler | refus
    callback_choice: Optional[str] = None  # 1h | 18h | demain_10h | custom
    callback_at: Optional[str] = None
    refus_reason: Optional[str] = None
    message_laisse: Optional[bool] = None
    mail_envoye: Optional[bool] = None
    message_envoye: Optional[bool] = None
    note: Optional[str] = None
    quoted_price: Optional[str] = None
    rdv_date: Optional[str] = None  # AAAA-MM-JJ
    rdv_slot: Optional[str] = None  # 9h-12h | 12h-14h | 14h-17h | 17h-20h

class RelanceLogRequest(BaseModel):
    by: str
    channel: str  # email | whatsapp

# Allowed status values (Phase 2 — pipeline 6 statuts)
ALLOWED_STATUSES = {"nouveau", "pas_de_reponse", "a_rappeler", "reflechit", "devis_accepte", "rdv_pris",
                    "facture", "refus_devis", "client_perdu", "contacte", "pris_en_charge"}  # 2 derniers : anciens statuts
# Map legacy → new
LEGACY_STATUS_MAP = {
    "en_attente": "contacte",
    "cloture": "facture",
    # Older legacy values
    "contacte_old": "contacte",
    "rdv_fixe": "pris_en_charge",
    "repare": "facture",
    "annule": "facture",
}

# ==================== JOURNAL D'APPEL (S18) ====================

# Motifs de perte / refus — liste fixe en un clic. "Injoignable" couvre déjà
# "ne répond plus" (pas de doublon sémantique dans la liste).
LOST_REASON_LABELS = {
    "injoignable": "Injoignable",
    "prix": "Prix",
    "delai": "Délai",
    "deja_repare_ailleurs": "Déjà réparé ailleurs",
    "plus_besoin": "N'en a plus besoin",
    "piece_indisponible": "Pièce indisponible",
    "magasin_ferme": "Magasin fermé",
    "numero_invalide": "Numéro invalide",
    "doublon_erreur": "Doublon / erreur",
    "autre": "Autre",
}
LOST_REASON_CODES = set(LOST_REASON_LABELS.keys())
# Sous-ensemble proposé après un appel "Refus" (pas de Magasin fermé / Numéro
# invalide / Injoignable / Doublon dans ce contexte précis).
REFUS_REASON_CODES = {"prix", "delai", "deja_repare_ailleurs", "plus_besoin", "piece_indisponible", "autre"}

CALL_OUTCOMES = {"joint", "pas_de_reponse", "numero_invalide"}
CALL_JOINT_DETAILS = {"rdv_pris", "vient_magasin", "devis_accepte", "reflechit", "rappeler", "refus"}
CALLBACK_CHOICES = {"1h", "18h", "demain_10h", "custom"}

CALL_DETAIL_LABELS = {
    "rdv_pris": "Devis accepté + RDV pris", "vient_magasin": "Vient en magasin",
    "devis_accepte": "Devis accepté, va venir", "reflechit": "Réfléchit", "rappeler": "À rappeler", "refus": "Refus",
}

# Statuts pour lesquels un lead n'a plus besoin d'être appelé (onglet "À appeler" — S19).
NON_CALLABLE_STATUSES = {"pris_en_charge", "facture", "refus_devis", "client_perdu"}

# Le résultat d'appel pilote le statut (S20) : les équipes n'utilisent que le
# bouton « 📞 Appel », le menu de statut ne sert plus qu'à « Client Facturé » et
# aux corrections. Un lead déjà facturé n'est jamais modifié par un appel.
CALL_DETAILS_TAKEN_IN = {"rdv_pris", "vient_magasin", "devis_accepte"}

STATUS_BY_CALL_DETAIL = {
    "rdv_pris": "rdv_pris", "devis_accepte": "devis_accepte", "vient_magasin": "devis_accepte",
    "reflechit": "reflechit", "rappeler": "a_rappeler", "refus": "refus_devis",
}

def _status_after_call(current: str, outcome: str, detail: Optional[str]) -> str:
    """Le dernier appel décide du statut. Un lead facturé n'est jamais modifié par un appel."""
    if current == "facture":
        return current
    if outcome == "numero_invalide":
        return "client_perdu"
    if outcome == "pas_de_reponse":
        return "pas_de_reponse"
    return STATUS_BY_CALL_DETAIL.get(detail, current)

def _format_paris_hhmm(dt: datetime) -> str:
    p = dt.astimezone(PARIS_TZ)
    return f"{p.hour:02d}h{p.minute:02d}"

def _unreachable_rule_satisfied(doc: dict) -> bool:
    """« Injoignable » exige au moins 6 appels « pas de réponse », seulement pour
    les leads créés après le début du suivi (tracking_since)."""
    created_at = doc.get("created_at")
    tracking_since = doc.get("tracking_since")
    if created_at and tracking_since and created_at < tracking_since:
        return True
    return sum(1 for c in doc.get("call_attempts") or [] if c.get("outcome") == "pas_de_reponse") >= 6

def _resolve_callback_at(choice: Optional[str], custom_at: Optional[str]) -> Optional[str]:
    now_paris = datetime.now(PARIS_TZ)
    if choice == "1h":
        dt = now_paris + timedelta(hours=1)
    elif choice == "18h":
        dt = now_paris.replace(hour=18, minute=0, second=0, microsecond=0)
        if dt <= now_paris:
            dt += timedelta(days=1)
    elif choice == "demain_10h":
        dt = (now_paris + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0)
    elif choice == "custom":
        return custom_at
    else:
        return None
    return dt.astimezone(timezone.utc).isoformat()

def _business_days_later_10h(days: int) -> str:
    dt = datetime.now(PARIS_TZ)
    added = 0
    while added < days:
        dt += timedelta(days=1)
        if dt.weekday() != 6:
            added += 1
    return dt.replace(hour=10, minute=0, second=0, microsecond=0).astimezone(timezone.utc).isoformat()

def _call_result_label(entry: Optional[dict]) -> str:
    if not entry:
        return ""
    outcome = entry.get("outcome")
    if outcome == "joint":
        label = CALL_DETAIL_LABELS.get(entry.get("detail"), entry.get("detail") or "")
        if entry.get("detail") == "refus" and entry.get("refus_reason"):
            label += f" ({LOST_REASON_LABELS.get(entry['refus_reason'], entry['refus_reason'])})"
        return label
    if outcome == "pas_de_reponse":
        parts = ["Pas de réponse", "message laissé" if entry.get("message_laisse") else "sans message"]
        if entry.get("mail_envoye"):
            parts.append("email envoyé")
        if entry.get("message_envoye"):
            parts.append("WhatsApp/SMS envoyé")
        return ", ".join(parts)
    if outcome == "numero_invalide":
        return "Numéro invalide"
    return outcome or ""

def _annotate_call_journal_export_fields(d: dict) -> None:
    """Mutates a lead dict in-place, guaranteeing the 7 Call Journal CSV columns
    are always present (even empty) regardless of the document's actual fields."""
    d["assigned_to"] = d.get("assigned_to") or ""
    d["lost_reason_code"] = d.get("lost_reason_code") or ""
    attempts = d.get("call_attempts") or []
    d["call_attempts_count"] = len(attempts)
    d["messages_left_count"] = sum(1 for c in attempts if c.get("outcome") == "pas_de_reponse" and c.get("message_laisse"))
    d["last_call_result"] = _call_result_label(attempts[-1]) if attempts else ""
    first_contact_at = d.get("first_contact_at")
    d["first_contact_at"] = first_contact_at or ""
    if first_contact_at and d.get("created_at"):
        try:
            created_dt = datetime.fromisoformat(d["created_at"])
            fc_dt = datetime.fromisoformat(first_contact_at)
            d["first_contact_delay_min"] = round(_business_minutes_elapsed(created_dt, fc_dt))
        except Exception:
            d["first_contact_delay_min"] = ""
    else:
        d["first_contact_delay_min"] = ""


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/login")
async def admin_login(input: LoginRequest):
    user = await db.admin_users.find_one({"email": input.email.lower().strip()}, {"_id": 0})
    if not user or not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_access_token(user["email"], user["email"])
    return {"token": token, "email": user["email"], "name": user["name"], "role": user["role"]}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_admin)):
    return {"email": user["email"], "name": user["name"], "role": user["role"]}


# ==================== FORM ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Repair & Co API", "status": "online"}

@api_router.post("/quote")
async def create_quote(input: QuoteRequestCreate):
    if input.store in PUBLIC_BLOCKED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store)
    doc = input.model_dump()
    doc.update({
        "id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "devis",
        "status_history": [{"status": "nouveau", "at": now_str, "by": "system"}],
        "call_attempts": [], "assigned_to": None, "first_contact_at": None,
        "lost_reason_code": None, "tracking_since": now_str,
    })
    await db.demandes_devis.insert_one(doc)
    asyncio.ensure_future(_send_client_sms("demandes_devis", doc["id"], doc, "confirmation"))
    asyncio.ensure_future(_sync_and_persist(
        "demandes_devis", doc["id"],
        first_name=doc.get('first_name'), last_name=doc['name'],
        phone=doc['phone'], email=doc['email'],
    ))
    asyncio.ensure_future(_notify_lead(
        "demandes_devis", doc["id"], doc.get("store"),
        f"[Repair&Co] Nouveau devis — {doc['name']} — {store_name}",
        build_email_html(
            title="Nouvelle demande de devis",
            demand_type="Demande de devis",
            store_name=store_name,
            client={"Nom": doc['name'], "Téléphone": doc['phone'], "Email": doc['email']},
            details={
                "Type d'appareil": doc['device_type'], "Marque": doc['brand'], "Modèle": doc['model'],
                "Problèmes": doc['issue_types'], "Autre problème": doc.get('other_issue'),
                "Créneau préféré": doc.get('preferred_time'),
            },
            submitted_at=now_fr,
            demand_id=doc["id"],
        ),
        doc, "devis",
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/contact")
async def create_contact(input: ContactRequestCreate):
    if input.store and input.store in PUBLIC_BLOCKED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store) if input.store else "Non précisé"
    doc = input.model_dump()
    doc.update({
        "id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "contact",
        "status_history": [{"status": "nouveau", "at": now_str, "by": "system"}],
        "call_attempts": [], "assigned_to": None, "first_contact_at": None,
        "lost_reason_code": None, "tracking_since": now_str,
    })
    await db.demandes_contact.insert_one(doc)
    asyncio.ensure_future(_send_client_sms("demandes_contact", doc["id"], doc, "confirmation"))
    asyncio.ensure_future(_sync_and_persist(
        "demandes_contact", doc["id"],
        first_name=doc.get('first_name'), last_name=doc['name'],
        phone=doc.get('phone'), email=doc['email'],
    ))
    is_rdv = bool(doc.get('rdv_device_type') or doc.get('rdv_brand') or (doc.get('subject') or '').startswith('RDV'))
    demand_label = "RDV" if is_rdv else "message"
    asyncio.ensure_future(_notify_lead(
        "demandes_contact", doc["id"], doc.get("store"),
        f"[Repair&Co] Nouveau {demand_label} — {doc['name']} — {store_name}",
        build_email_html(
            title="Nouvelle demande de rendez-vous" if is_rdv else "Nouveau message",
            demand_type="Demande de rendez-vous" if is_rdv else "Message / Contact",
            store_name=store_name,
            client={"Nom": doc['name'], "Téléphone": doc.get('phone'), "Email": doc['email']},
            details={
                "Objet": doc['subject'],
                "Type d'appareil": doc.get('rdv_device_type'),
                "Marque": doc.get('rdv_brand'),
                "Modèle": doc.get('rdv_model'),
                "Panne": doc.get('rdv_issue'),
                "Date du RDV": doc.get('rdv_date'),
                "Créneau": doc.get('rdv_slot'),
                # Free-text message: only show if it's a non-RDV demand OR if the user added a real comment.
                "Message": (None if is_rdv else doc.get('message')),
            },
            submitted_at=now_fr,
            demand_id=doc["id"],
        ),
        doc, "contact",
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/b2b")
async def create_b2b(input: B2BRequestCreate):
    if input.store and input.store in PUBLIC_BLOCKED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store) if input.store else "—"
    doc = input.model_dump()
    doc.update({
        "id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "entreprise",
        "status_history": [{"status": "nouveau", "at": now_str, "by": "system"}],
        "call_attempts": [], "assigned_to": None, "first_contact_at": None,
        "lost_reason_code": None, "tracking_since": now_str,
    })
    await db.demandes_entreprise.insert_one(doc)
    asyncio.ensure_future(_sync_and_persist(
        "demandes_entreprise", doc["id"],
        first_name=doc['first_name'], last_name=doc['last_name'],
        phone=doc['phone'], email=doc['email'],
    ))
    full_name = f"{doc['first_name']} {doc['last_name']}".strip()
    asyncio.ensure_future(_notify_b2b(
        "demandes_entreprise", doc["id"], doc.get("store"),
        f"[Repair&Co] Nouveau B2B — {full_name} — {doc['company']}",
        build_email_html(
            title="Demande Services Entreprise",
            demand_type="Demande B2B / Entreprise",
            store_name=store_name,
            client={
                "Prénom": doc['first_name'], "Nom": doc['last_name'], "Société": doc['company'],
                "Email": doc['email'], "Téléphone": doc['phone'],
            },
            details={
                "Taille de flotte": doc['fleet_size'],
                "Type de besoin": doc.get('need_type'),
                "Message": doc.get('message'),
            },
            submitted_at=now_fr,
            demand_id=doc["id"],
        ),
        doc, "entreprise",
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/buyback")
async def create_buyback(input: BuybackRequestCreate):
    if input.store in PUBLIC_BLOCKED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store)
    doc = input.model_dump()
    doc.update({
        "id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "rachat",
        "status_history": [{"status": "nouveau", "at": now_str, "by": "system"}],
        "call_attempts": [], "assigned_to": None, "first_contact_at": None,
        "lost_reason_code": None, "tracking_since": now_str,
    })
    await db.demandes_rachat.insert_one(doc)
    asyncio.ensure_future(_send_client_sms("demandes_rachat", doc["id"], doc, "confirmation"))
    asyncio.ensure_future(_sync_and_persist(
        "demandes_rachat", doc["id"],
        first_name=doc.get('first_name'), last_name=doc['name'],
        phone=doc['phone'],
    ))
    asyncio.ensure_future(_notify_lead(
        "demandes_rachat", doc["id"], doc.get("store"),
        f"[Repair&Co] Nouveau rachat — {doc['name']} — {store_name}",
        build_email_html(
            title="Demande de rachat",
            demand_type="Demande de rachat",
            store_name=store_name,
            client={"Nom": doc['name'], "Téléphone": doc['phone']},
            details={
                "Marque": doc['brand'], "Modèle": doc['model'],
                "État": CONDITION_LABELS.get(doc['condition'], doc['condition']),
            },
            submitted_at=now_fr,
            demand_id=doc["id"],
        ),
        doc, "rachat",
    ))
    return {"status": "success", "id": doc["id"]}


# ==================== ADMIN ROUTES ====================

COLLECTIONS = {
    "devis": "demandes_devis",
    "contact": "demandes_contact",
    "entreprise": "demandes_entreprise",
    "rachat": "demandes_rachat",
}

@api_router.get("/admin/demandes/{category}")
async def get_demandes(category: str, store: Optional[str] = Query(None), date_from: Optional[str] = Query(None), date_to: Optional[str] = Query(None), status: Optional[str] = Query(None), user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    query = {}
    if store:
        query["store"] = store
    if status and status != "all":
        query["status"] = status
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to + "T23:59:59.999999"
        query["created_at"] = date_filter
    docs = await db[col_name].find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.patch("/admin/demandes/{category}/{demand_id}/status")
async def update_demand_status(category: str, demand_id: str, body: UpdateStatusRequest, user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante — merci de préciser qui effectue le changement")
    new_status = LEGACY_STATUS_MAP.get(body.status, body.status)
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")

    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    now_iso = datetime.now(timezone.utc).isoformat()
    update_fields = {"status": new_status}
    if new_status in ("client_perdu", "refus_devis") and body.lost_reason_code:
        if body.lost_reason_code not in LOST_REASON_CODES:
            raise HTTPException(status_code=400, detail="Motif de perte invalide")
        if new_status == "client_perdu" and body.lost_reason_code == "injoignable" and not _unreachable_rule_satisfied(doc):
            raise HTTPException(status_code=400, detail="Il faut 6 appels « Pas de réponse » avant de classer Injoignable.")
        update_fields["lost_reason_code"] = body.lost_reason_code
    if body.lost_reason:
        update_fields["lost_reason"] = body.lost_reason
    if new_status not in ("client_perdu", "refus_devis"):
        update_fields["lost_reason_code"] = None
        update_fields["lost_reason"] = None
    if new_status in ("facture", "refus_devis", "client_perdu"):
        update_fields["callback_at"] = None
    if not doc.get("assigned_to"):
        update_fields["assigned_to"] = by
    if (doc.get("status") or "nouveau") == "nouveau" and not doc.get("first_contact_at"):
        update_fields["first_contact_at"] = now_iso

    result = await db[col_name].update_one(
        {"id": demand_id},
        {"$set": update_fields, "$push": {"status_history": {"status": new_status, "at": now_iso, "by": by}}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "updated"}

@api_router.post("/admin/demandes/{category}/{demand_id}/call")
async def log_call(category: str, demand_id: str, body: CallLogRequest, user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante — merci de préciser qui appelle")
    if body.outcome not in CALL_OUTCOMES:
        raise HTTPException(status_code=400, detail="Résultat d'appel invalide")
    if body.outcome == "joint":
        if body.detail not in CALL_JOINT_DETAILS:
            raise HTTPException(status_code=400, detail="Détail d'appel invalide")
        if body.detail == "rdv_pris" and (not body.rdv_date or body.rdv_slot not in RDV_SLOTS):
            raise HTTPException(status_code=400, detail="Date et plage horaire du RDV requises")
        if body.detail == "rappeler" or (body.detail == "reflechit" and body.callback_choice):
            if body.callback_choice not in CALLBACK_CHOICES:
                raise HTTPException(status_code=400, detail="Choix de rappel invalide")
            if body.callback_choice == "custom" and not body.callback_at:
                raise HTTPException(status_code=400, detail="Date de rappel requise")
        if body.detail == "refus" and body.refus_reason not in REFUS_REASON_CODES:
            raise HTTPException(status_code=400, detail="Motif de refus invalide")

    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    now_iso = datetime.now(timezone.utc).isoformat()
    entry = {
        "at": now_iso, "by": by, "outcome": body.outcome, "detail": body.detail,
        "refus_reason": body.refus_reason if body.detail == "refus" else None,
        "message_laisse": body.message_laisse if body.outcome == "pas_de_reponse" else None,
        "mail_envoye": body.mail_envoye if body.outcome == "pas_de_reponse" else None,
        "message_envoye": body.message_envoye if body.outcome == "pas_de_reponse" else None,
        "note": (body.note or "").strip() or None,
    }
    if body.detail == "rappeler" or (body.detail == "reflechit" and body.callback_choice):
        entry["callback_at"] = _resolve_callback_at(body.callback_choice, body.callback_at)
    elif body.detail == "reflechit":
        entry["callback_at"] = _business_days_later_10h(2)
    if body.detail == "rdv_pris":
        start_utc, end_utc = _rdv_bounds(body.rdv_date, body.rdv_slot)
        entry.update({"appt_date": body.rdv_date, "appt_slot": body.rdv_slot,
                      "appt_start_at": start_utc.isoformat(), "appt_end_at": end_utc.isoformat()})

    set_fields = {}
    quoted_price = (body.quoted_price or "").strip()
    if quoted_price:
        entry["quoted_price"] = quoted_price
        set_fields["quoted_price"] = quoted_price
    if not doc.get("first_contact_at"):
        set_fields["first_contact_at"] = now_iso
    if not doc.get("assigned_to"):
        set_fields["assigned_to"] = by
    push_fields = {"call_attempts": entry}
    current_status = doc.get("status") or "nouveau"
    new_status = _status_after_call(current_status, body.outcome, body.detail)
    if new_status != current_status:
        set_fields["status"] = new_status
        push_fields["status_history"] = {"status": new_status, "at": now_iso, "by": by}
    # La raison de perte n'existe que pour un client perdu ou un refus.
    if new_status == "refus_devis":
        set_fields["lost_reason_code"] = body.refus_reason
    elif new_status == "client_perdu":
        set_fields["lost_reason_code"] = "numero_invalide"
    elif doc.get("lost_reason_code") or doc.get("lost_reason"):
        set_fields["lost_reason_code"] = None
        set_fields["lost_reason"] = None
    # Prochaine action : heure de rappel, ou créneau du RDV.
    set_fields["callback_at"] = entry.get("callback_at") if new_status in ("a_rappeler", "reflechit") else None
    for k in ("appt_date", "appt_slot", "appt_start_at", "appt_end_at"):
        set_fields[k] = entry.get(k) if new_status == "rdv_pris" else None

    update_op = {"$push": push_fields}
    if set_fields:
        update_op["$set"] = set_fields
    await db[col_name].update_one({"id": demand_id}, update_op)
    if new_status == "rdv_pris" and current_status != "facture":
        asyncio.ensure_future(_send_client_sms(col_name, demand_id, {**doc, **set_fields}, "rdv"))
    return {
        "status": "logged",
        "call_attempts_count": len(doc.get("call_attempts") or []) + 1,
        "new_status": set_fields.get("status", current_status),
        "callback_at": entry.get("callback_at"),
        "lost_reason_code": set_fields.get("lost_reason_code", doc.get("lost_reason_code")),
        "lost_reason": set_fields.get("lost_reason", doc.get("lost_reason")),
        "quoted_price": set_fields.get("quoted_price", doc.get("quoted_price")),
        "appt_date": set_fields.get("appt_date"), "appt_slot": set_fields.get("appt_slot"),
        "appt_start_at": set_fields.get("appt_start_at"), "appt_end_at": set_fields.get("appt_end_at"),
    }

@api_router.post("/admin/demandes/{category}/{demand_id}/relance")
async def log_relance(category: str, demand_id: str, body: RelanceLogRequest, user=Depends(get_current_admin)):
    """Trace dans l'historique un clic sur « Relance Email » ou « Relance WhatsApp »."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante, merci de préciser qui relance")
    if body.channel not in ("email", "whatsapp"):
        raise HTTPException(status_code=400, detail="Canal de relance invalide")
    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    now_iso = datetime.now(timezone.utc).isoformat()
    set_fields = {}
    push_fields = {"relances": {"at": now_iso, "by": by, "channel": body.channel}}
    if not doc.get("first_contact_at"):
        set_fields["first_contact_at"] = now_iso
    if not doc.get("assigned_to"):
        set_fields["assigned_to"] = by
    update_op = {"$push": push_fields}
    if set_fields:
        update_op["$set"] = set_fields
    await db[col_name].update_one({"id": demand_id}, update_op)
    return {"status": "logged", "new_status": set_fields.get("status", doc.get("status") or "nouveau")}

@api_router.delete("/admin/demandes/{category}/{demand_id}")
async def delete_demand(category: str, demand_id: str, body: DeleteRequest, user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    if body.code != DELETE_CODE:
        raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    result = await db[col_name].delete_one({"id": demand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "deleted"}

@api_router.patch("/admin/demandes/{category}/{demand_id}/feedback")
async def update_staff_feedback(category: str, demand_id: str, body: StaffFeedbackRequest, user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        return {"status": "no_change"}
    result = await db[col_name].update_one({"id": demand_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "updated"}

@api_router.patch("/admin/demandes/{category}/{demand_id}/quoted-price")
async def update_quoted_price(category: str, demand_id: str, body: QuotedPriceRequest, user=Depends(get_current_admin)):
    """Store the phone-quoted repair price (free text: "≈90€", "à confirmer", …).
    Empty string clears the value."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    result = await db[col_name].update_one(
        {"id": demand_id},
        {"$set": {"quoted_price": (body.quoted_price or "").strip()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "updated"}

@api_router.get("/admin/latest")
async def get_latest_demands(store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    """Return the 5 most-recent leads across all 4 collections, optionally filtered
    by store. Used by the admin UI for the "new lead" polling / alert system."""
    query = {"is_test": {"$ne": True}}
    if store:
        query["store"] = store
    items = []
    for demand_type, col_name in COLLECTIONS.items():
        if demand_type == "entreprise":
            continue
        docs = await db[col_name].find(
            query,
            {"_id": 0, "id": 1, "store": 1, "created_at": 1,
             "name": 1, "first_name": 1, "last_name": 1, "company": 1},
        ).sort("created_at", -1).limit(5).to_list(5)
        for d in docs:
            label = (
                d.get("name")
                or " ".join(x for x in [d.get("first_name"), d.get("last_name")] if x).strip()
                or d.get("company")
                or "Client"
            )
            items.append({
                "id": d["id"],
                "type": demand_type,
                "store": d.get("store"),
                "created_at": d.get("created_at"),
                "label": label,
            })
    items.sort(key=lambda it: it.get("created_at") or "", reverse=True)
    return items[:5]

@api_router.get("/admin/to-call")
async def get_to_call_list(store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    """Qui appeler maintenant — agrège les 4 catégories, applique la règle
    métier (S19) et renvoie une liste triée prête à afficher dans l'onglet
    "📞 À appeler". Ne modifie jamais de données — lecture seule."""
    now_utc = datetime.now(timezone.utc)
    query = {"status": {"$nin": list(NON_CALLABLE_STATUSES)}}
    if store == TEST_STORE_ID:
        query["is_test"] = True
        query["store"] = TEST_STORE_ID
    else:
        query["is_test"] = {"$ne": True}
        query["store"] = {"$ne": TEST_STORE_ID}
        if store:
            query["store"] = store

    items = []
    for category, col_name in COLLECTIONS.items():
        if category == "entreprise":
            continue
        docs = await db[col_name].find(query, {"_id": 0}).to_list(2000)
        for d in docs:
            created_at = d.get("created_at")
            tracking_since = d.get("tracking_since")
            # Seulement les leads créés après le début du suivi complet.
            if not created_at or not tracking_since or created_at < tracking_since:
                continue
            try:
                created_dt = datetime.fromisoformat(created_at)
            except Exception:
                continue

            call_attempts = d.get("call_attempts") or []
            last_call = call_attempts[-1] if call_attempts else None
            status = d.get("status") or "nouveau"
            if status not in ("nouveau", "pas_de_reponse", "a_rappeler", "reflechit", "devis_accepte", "rdv_pris") and last_call:
                # ancien statut : on se fie au dernier appel
                status = "pas_de_reponse" if last_call.get("outcome") == "pas_de_reponse" else STATUS_BY_CALL_DETAIL.get(last_call.get("detail"), status)
            section, group, label, sort_at = None, None, None, created_at
            today_paris = now_utc.astimezone(PARIS_TZ).date()
            callback_at = d.get("callback_at") or (last_call or {}).get("callback_at")
            reflechit_count = sum(1 for c in call_attempts if c.get("detail") == "reflechit")
            try:
                if status == "rdv_pris" and d.get("appt_end_at"):
                    start_dt, end_dt = datetime.fromisoformat(d["appt_start_at"]), datetime.fromisoformat(d["appt_end_at"])
                    if now_utc >= end_dt + timedelta(hours=1):
                        section, group, sort_at = "maintenant", 8, d["appt_end_at"]
                        label = f"RDV du {_format_paris_day(start_dt)} ({d.get('appt_slot')}) passé : le client est-il venu ?"
                    elif start_dt.astimezone(PARIS_TZ).date() == today_paris:
                        section, group, sort_at = "plus_tard", 9, d["appt_start_at"]
                        label = f"RDV aujourd'hui, {d.get('appt_slot')}"
                elif status == "devis_accepte" and last_call:
                    accepted_dt = datetime.fromisoformat(last_call["at"])
                    if now_utc >= accepted_dt + timedelta(hours=24):
                        section, group, sort_at = "maintenant", 7, last_call["at"]
                        label = f"Devis accepté le {_format_paris_day(accepted_dt)} : le client est-il venu ?"
                elif status == "reflechit" and reflechit_count >= 3:
                    section, group = "a_classer", 6
                    label = f"Réfléchit toujours après {reflechit_count - 1} relances"
                elif status in ("a_rappeler", "reflechit") and callback_at:
                    cb_dt = datetime.fromisoformat(callback_at)
                    kind = "Relance du devis prévue" if status == "reflechit" else "Rappel prévu"
                    if cb_dt <= now_utc:
                        late = " (en retard)" if (now_utc - cb_dt) > timedelta(minutes=15) else ""
                        section, group, sort_at = "maintenant", 1, callback_at
                        label = f"{kind} à {_format_paris_hhmm(cb_dt)}{late}"
                    elif cb_dt.astimezone(PARIS_TZ).date() == today_paris:
                        section, group, sort_at = "plus_tard", 5, callback_at
                        label = f"{kind} à {_format_paris_hhmm(cb_dt)}"
                elif status == "nouveau":
                    section, group = "maintenant", 2
                    label = f"Nouvelle demande, attend depuis {_format_waiting_since(created_dt, now_utc)}"
                elif status == "pas_de_reponse" and last_call:
                    no_answer = sum(1 for c in call_attempts if c.get("outcome") == "pas_de_reponse")
                    if _unreachable_rule_satisfied(d):
                        section, group = "a_classer", 4
                        label = f"{no_answer} appels sans réponse"
                    else:
                        last_call_dt = datetime.fromisoformat(last_call["at"])
                        if _business_minutes_elapsed(last_call_dt, now_utc) > 180:
                            day = last_call_dt.astimezone(PARIS_TZ).strftime("%d/%m")
                            section, group, sort_at = "maintenant", 3, last_call["at"]
                            label = f"{len(call_attempts) + 1}e appel (pas de réponse le {day} à {_format_paris_hhmm(last_call_dt)})"
            except Exception:
                section = None

            if section is None:
                continue

            item = dict(d)
            item["category"] = category
            item["group"] = group
            item["label"] = label
            item["section"] = section
            item["call_attempts_count"] = len(call_attempts)
            item["sort_at"] = sort_at
            item["store_name"] = STORE_NAMES.get(d.get("store"), d.get("store") or "")
            items.append(item)

    section_order = {"maintenant": 0, "plus_tard": 1, "a_classer": 2}
    items.sort(key=lambda it: (section_order[it["section"]], it["group"], it.get("sort_at") or it.get("created_at") or ""))
    return items

@api_router.post("/demandes/{category}/{demand_id}/survey")
async def submit_customer_survey(category: str, demand_id: str, body: CustomerSurveyRequest):
    """Public endpoint — customer fills mini-survey right after submitting their demand.
    On save, sends a follow-up email with the survey responses linked to the demand.
    """
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    update = {}
    if body.customer_source:
        update["customer_source"] = body.customer_source
    if body.customer_feedback:
        update["customer_feedback"] = body.customer_feedback
    if not update:
        return {"status": "no_change"}
    result = await db[col_name].update_one({"id": demand_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    # Send a follow-up email with the demand + survey responses.
    demand = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if demand:
        client_label = demand.get("name") or f"{demand.get('first_name','')} {demand.get('last_name','')}".strip() or "Client"
        store_name = STORE_NAMES.get(demand.get("store"), demand.get("store") or "—")
        survey = {
            "Comment nous a-t-il connus": SOURCE_LABELS.get(demand.get("customer_source"), demand.get("customer_source")),
            "Point à améliorer (site)": demand.get("customer_feedback"),
        }
        client = {
            "Nom": demand.get("name"),
            "Prénom": demand.get("first_name"),
            "Nom (B2B)": demand.get("last_name"),
            "Société": demand.get("company"),
            "Téléphone": demand.get("phone"),
            "Email": demand.get("email"),
        }
        details = {
            "Type d'appareil": demand.get("device_type"),
            "Marque": demand.get("brand"),
            "Modèle": demand.get("model"),
            "Problèmes": demand.get("issue_types"),
            "État": CONDITION_LABELS.get(demand.get("condition"), demand.get("condition")),
            "Objet": demand.get("subject"),
            "Message": demand.get("message"),
            "Taille de flotte": demand.get("fleet_size"),
            "Type de besoin": demand.get("need_type"),
        }
        asyncio.ensure_future(send_notification(
            f"[Repair&Co] Mini-enquête — {client_label} — {store_name}",
            build_email_html(
                title=f"Mini-enquête client reçue ({category})",
                demand_type=f"Mini-enquête / {category}",
                store_name=store_name,
                client=client,
                details=details,
                submitted_at=format_now_fr(),
                demand_id=demand_id,
                survey=survey,
                header_note="Le client vient de remplir la mini-enquête post-soumission.",
            )
        ))
    return {"status": "saved"}

def build_sms_recall_message(doc: dict, category: str) -> str:
    """Build the SMS recall message ('RAPPEL') from a stored lead document."""
    return build_sms_text(doc, category, prefix="RAPPEL - LEAD NON TRAITE")


@api_router.post("/admin/demandes/{category}/{demand_id}/push-sms")
async def push_sms_single(category: str, demand_id: str, body: DeleteRequest, user=Depends(get_current_admin)):
    if body.code != DELETE_CODE:
        raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    store_id = doc.get("store", "")
    primary_number = STORE_PRIMARY_SMS.get(store_id)
    if not primary_number:
        raise HTTPException(status_code=400, detail="Aucun numéro SMS configuré pour ce magasin")
    entry = await send_sms(primary_number, build_sms_recall_message(doc, category), kind="primary")
    if entry:
        await db[col_name].update_one({"id": demand_id}, {"$push": {"notifications": entry}})
    logger.info(f"[PUSH SMS] Single push: {category}/{demand_id} → {store_id}")
    return {"status": "sent" if entry and entry.get("status") == "sent" else "failed", "store": store_id}


@api_router.post("/admin/push-sms/rattrapage")
async def push_sms_rattrapage(body: DeleteRequest, user=Depends(get_current_admin)):
    if body.code != DELETE_CODE:
        raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    sent = []
    for category, col_name in COLLECTIONS.items():
        if category == "entreprise":
            continue
        docs = await db[col_name].find({"status": "nouveau"}, {"_id": 0}).to_list(500)
        for doc in docs:
            store_id = doc.get("store", "")
            primary_number = STORE_PRIMARY_SMS.get(store_id)
            if not primary_number:
                continue
            message = build_sms_recall_message(doc, category)

            async def _send_and_persist(col=col_name, demand_id=doc["id"], num=primary_number, msg=message):
                entry = await send_sms(num, msg, kind="primary")
                if entry:
                    await db[col].update_one({"id": demand_id}, {"$push": {"notifications": entry}})

            asyncio.ensure_future(_send_and_persist())
            sent.append({"category": category, "id": doc.get("id"), "client": f"{doc.get('first_name','')} {doc.get('name','')}".strip()})
    logger.info(f"[PUSH SMS] Rattrapage: {len(sent)} messages envoyés")
    return {"status": "sent", "count": len(sent), "details": sent}


class NotificationsTestRequest(BaseModel):
    store: str
    real: bool = False


def _demo_call(at: datetime, by: str, outcome: str, detail: Optional[str] = None, **kw) -> dict:
    entry = {"at": at.isoformat(), "by": by, "outcome": outcome, "detail": detail, "refus_reason": kw.get("refus_reason"),
             "message_laisse": kw.get("message_laisse"), "mail_envoye": kw.get("mail_envoye"),
             "message_envoye": kw.get("message_envoye"), "note": None}
    if kw.get("quoted_price"):
        entry["quoted_price"] = kw["quoted_price"]
    if kw.get("callback_at"):
        entry["callback_at"] = kw["callback_at"].isoformat()
    for k in ("appt_date", "appt_slot", "appt_start_at", "appt_end_at"):
        if kw.get(k):
            entry[k] = kw[k]
    return entry

DEMO_TYPES = {"demandes_devis": "devis", "demandes_contact": "contact", "demandes_rachat": "rachat"}

def _demo_leads(now: datetime, by: str) -> list:
    """Des exemples de chaque statut dans chaque onglet (Devis, Contact / RDV, Rachat).
    Renvoie des couples (collection, document)."""
    h = lambda n: timedelta(hours=n)
    call = lambda hours_ago, *a, **kw: _demo_call(now - h(hours_ago), by, *a, **kw)

    def demo(col, first, name, created, status="nouveau", calls=(), **fields):
        c = created.isoformat()
        history = [{"status": "nouveau", "at": c, "by": "system"}]
        if status != "nouveau":
            history.append({"status": status, "at": calls[-1]["at"] if calls else (created + h(1)).isoformat(), "by": by})
        doc = {
            "id": str(uuid.uuid4()), "type": DEMO_TYPES[col], "demo": True,
            "first_name": first, "name": name, "phone": "0600000000",
            "created_at": c, "tracking_since": c, "status": status, "status_history": history,
            "call_attempts": list(calls), "assigned_to": by if calls else None,
            "first_contact_at": calls[0]["at"] if calls else None, "lost_reason_code": None,
            "notifications": [], "escalations_sent": ["15min:skipped", "30min:skipped", "2h:skipped"],
        }
        doc.update(fields)
        return col, doc

    def devis(first, name, model, issue, hours_ago, status="nouveau", calls=(), **extra):
        brand, _, short_model = model.partition(" ")
        return demo("demandes_devis", first, name, now - h(hours_ago), status, calls,
                    email=f"{first.lower()}@example.com", device_type="smartphone",
                    brand=brand, model=short_model, issue_types=[issue], **extra)

    def rdv_form(first, name, model, issue, hours_ago, day, slot, status="nouveau", calls=(), **extra):
        brand, _, short_model = model.partition(" ")
        return demo("demandes_contact", first, name, now - h(hours_ago), status, calls,
                    email=f"{first.lower()}@example.com",
                    subject=f"RDV : Smartphone {model} : {issue} : {day} {slot}", message="",
                    rdv_device_type="smartphone", rdv_brand=brand, rdv_model=short_model,
                    rdv_issue=issue, rdv_date=day, rdv_slot=slot, **extra)

    def contact(first, name, subject, message, hours_ago, status="nouveau", calls=(), **extra):
        return demo("demandes_contact", first, name, now - h(hours_ago), status, calls,
                    email=f"{first.lower()}@example.com", subject=subject, message=message, **extra)

    def rachat(first, name, model, condition, hours_ago, status="nouveau", calls=(), **extra):
        brand, _, short_model = model.partition(" ")
        return demo("demandes_rachat", first, name, now - h(hours_ago), status, calls,
                    brand=brand, model=short_model, condition=condition, **extra)

    def open_day(day_offset):
        # jour d'ouverture (pas de dimanche), en allant dans le sens du décalage
        d = now.astimezone(PARIS_TZ) + timedelta(days=day_offset)
        if d.weekday() == 6 and day_offset:
            d += timedelta(days=1 if day_offset > 0 else -1)
        return d.strftime("%Y-%m-%d")

    def appt(day_offset, slot):
        day = open_day(day_offset)
        start, end = _rdv_bounds(day, slot)
        return {"appt_date": day, "appt_slot": slot, "appt_start_at": start.isoformat(), "appt_end_at": end.isoformat()}

    tomorrow = open_day(1)
    cb_due, cb_later = now - timedelta(minutes=30), now + h(2)
    rdv_past, rdv_today, rdv_old = appt(-1, "14h-17h"), appt(0, "17h-20h"), appt(-3, "9h-12h")
    no_answer_6 = [call(n, "pas_de_reponse", message_laisse=False) for n in (29, 27, 25, 6, 4, 2)]
    return [
        # Devis : un exemple de chaque statut
        devis("Lucas", "Martin", "Apple iPhone 14", "Écran", 0.2),
        devis("Emma", "Bernard", "Samsung Galaxy S23", "Batterie", 5, "a_rappeler",
              [call(2, "joint", "rappeler", callback_at=cb_due)], callback_at=cb_due.isoformat()),
        devis("Léa", "Petit", "Apple iPhone 12", "Face ID", 4, "reflechit",
              [call(1, "joint", "reflechit", callback_at=cb_later, quoted_price="129")],
              callback_at=cb_later.isoformat(), quoted_price="129"),
        devis("Hugo", "Robert", "Apple iPhone 13", "Connecteur de charge", 24, "pas_de_reponse",
              [call(22, "pas_de_reponse", message_laisse=True, mail_envoye=True, message_envoye=False)]),
        devis("Chloé", "Richard", "Xiaomi Redmi Note 12", "Écran", 30, "pas_de_reponse", no_answer_6),
        devis("Sarah", "Durand", "Apple iPhone 15", "Écran", 40, "reflechit",
              [call(n, "joint", "reflechit", callback_at=now - h(n - 1), quoted_price="149") for n in (39, 20, 3)],
              callback_at=(now - h(2)).isoformat(), quoted_price="149"),
        devis("Nathan", "Dubois", "Google Pixel 7", "Écran", 40, "rdv_pris",
              [call(30, "joint", "rdv_pris", quoted_price="99", **rdv_past)], quoted_price="99", **rdv_past),
        devis("Inès", "Moreau", "Samsung Galaxy A54", "Batterie", 30, "devis_accepte",
              [call(26, "joint", "devis_accepte", quoted_price="79")], quoted_price="79"),
        devis("Paul", "Laurent", "Apple iPhone 11", "Batterie", 80, "facture",
              [call(78, "joint", "rdv_pris", quoted_price="69", **rdv_old)], quoted_price="69", **rdv_old),
        devis("Clara", "Simon", "Samsung Galaxy S21", "Écran", 50, "refus_devis",
              [call(48, "joint", "refus", refus_reason="prix", quoted_price="139")],
              quoted_price="139", lost_reason_code="prix"),
        devis("Louis", "Michel", "Apple iPhone XR", "Écran", 80, "client_perdu",
              [call(n, "pas_de_reponse", message_laisse=n > 50) for n in (79, 77, 56, 54, 31, 29)],
              lost_reason_code="injoignable"),
        # Contact / RDV
        rdv_form("Camille", "Garcia", "Apple iPhone 14 Pro", "Écran", 0.4, tomorrow, "Après-midi (14h-17h)"),
        rdv_form("Thomas", "Roux", "Samsung Galaxy S22", "Batterie", 6, tomorrow, "Matin (9h30-12h30)", "rdv_pris",
                 [call(5, "joint", "rdv_pris", quoted_price="89", **rdv_today)], quoted_price="89", **rdv_today),
        contact("Alice", "Fournier", "Question sur une réparation",
                "Bonjour, mon téléphone ne charge plus. Est-ce réparable, et en combien de temps ?", 7, "pas_de_reponse",
                [call(5, "pas_de_reponse", message_laisse=True, mail_envoye=False, message_envoye=False)]),
        contact("Jules", "Girard", "Demande de devis",
                "Écran cassé sur mon Galaxy S22, quel est le prix ?", 70, "facture",
                [call(68, "joint", "devis_accepte", quoted_price="159")], quoted_price="159"),
        # Rachat
        rachat("Julie", "Bonnet", "Apple iPhone 13", "bon", 0.7),
        rachat("Antoine", "Dupont", "Samsung Galaxy S22", "moyen", 3, "a_rappeler",
               [call(1, "joint", "rappeler", callback_at=now + h(1))], callback_at=(now + h(1)).isoformat()),
        rachat("Manon", "Lambert", "Apple iPhone 12", "abime", 26, "refus_devis",
               [call(24, "joint", "refus", refus_reason="prix", quoted_price="80")],
               quoted_price="80", lost_reason_code="prix"),
    ]

DEMO_MODE = os.environ.get("DEMO_MODE", "false").lower() == "true"
DEMO_STORES = ["lattes", "plaisir", "montpellier-nord", "boulogne", "les-ulis", "nimes-costieres", "montpellier-sud", "nimes-etoile"]

@api_router.post("/admin/notifications/demo-set")
async def create_demo_set(user=Depends(get_current_admin)):
    """Crée des exemples de chaque statut dans chaque onglet. Aucune notification,
    aucune escalade. En production : sur le Magasin TEST, supprimés après 48 h.
    Sur la démo (DEMO_MODE) : répartis sur les vrais magasins."""
    now = datetime.now(timezone.utc)
    by_col = {col: [] for col in DEMO_TYPES}
    for i, (col, d) in enumerate(_demo_leads(now, "Équipe TEST" if not DEMO_MODE else "Démo")):
        d.update({"store": DEMO_STORES[i % len(DEMO_STORES)], "is_test": False} if DEMO_MODE else {"store": TEST_STORE_ID, "is_test": True})
        by_col[col].append(d)
    for col, docs in by_col.items():
        await db[col].delete_many({"demo": True})
        if docs:
            await db[col].insert_many(docs)
    return {"created": sum(len(v) for v in by_col.values()), "demo_mode": DEMO_MODE}

class TestLeadCreateRequest(BaseModel):
    category: str  # "devis" or "contact"
    same_person: bool = False
    accelerated: bool = False


@api_router.post("/admin/notifications/test")
async def test_notifications(body: NotificationsTestRequest, user=Depends(get_current_admin)):
    """Send a single-attempt test SMS + email. By default (real=False) goes
    ONLY to TEST_RECIPIENT_EMAIL/SMS — never to the store, NOTIFY_EMAIL or
    SUPERVISION_EMAIL. real=True (explicit checkbox + confirmation on the
    frontend) sends to the store's actual recipients."""
    store_id = body.store
    if store_id not in STORE_NAMES:
        raise HTTPException(status_code=400, detail="Magasin inconnu")
    store_name = STORE_NAMES[store_id]
    is_real = bool(body.real)

    if is_real:
        recipients = [e.strip() for e in (NOTIFY_EMAIL or "").split(',') if e.strip()]
        for addr in extra_recipients_for_store(store_id):
            if addr and addr not in recipients:
                recipients.append(addr)
        sms_target = STORE_PRIMARY_SMS.get(store_id)
    else:
        recipients = [TEST_RECIPIENT_EMAIL] if TEST_RECIPIENT_EMAIL else []
        sms_target = TEST_RECIPIENT_SMS

    subject_prefix = "[TEST]" if not is_real else "[TEST — envoi réel]"
    email_entry = {"channel": "email", "kind": "primary", "to": ", ".join(recipients), "status": "failed", "attempts": 1}
    if not recipients:
        email_entry["error"] = "aucun destinataire configuré"
    else:
        try:
            await asyncio.to_thread(
                _send_smtp_email_raw,
                f"{subject_prefix} Notification — {store_name}",
                build_email_html(
                    title="TEST — ne pas traiter",
                    demand_type="Test de notification (bouton admin)",
                    store_name=store_name,
                    client={},
                    details={"Note": "Ceci est un envoi de test déclenché depuis /admin — ne correspond à aucun client réel."},
                    submitted_at=format_now_fr(),
                    demand_id="test",
                ),
                recipients,
            )
            email_entry["status"] = "sent"
            email_entry["at"] = datetime.now(timezone.utc).isoformat()
        except Exception as e:
            email_entry["error"] = str(e)[:300]
            email_entry["at"] = datetime.now(timezone.utc).isoformat()

    if not sms_target:
        sms_entry = {"channel": "sms", "status": "skipped", "error": "aucun numéro configuré"}
    elif not SMS_ENABLED:
        sms_entry = {"channel": "sms", "status": "skipped", "error": "SMS_ENABLED=false"}
    elif not _is_french_mobile(sms_target):
        sms_entry = {"channel": "sms", "to": sms_target, "status": "failed", "error": "numero non mobile"}
    else:
        sms_entry = {"channel": "sms", "kind": "primary", "to": sms_target, "status": "failed", "attempts": 1}
        try:
            text = _strip_accents(f"TEST - ne pas traiter\nRepair&Co - Test {store_name}\nrepairandco.fr/admin")
            result = await asyncio.to_thread(_brevo_send_sms_sync, sms_target, text)
            sms_entry["status"] = "sent"
            sms_entry["provider_id"] = result.get("messageId")
            sms_entry["at"] = datetime.now(timezone.utc).isoformat()
        except Exception as e:
            sms_entry["error"] = str(e)[:300]
            sms_entry["at"] = datetime.now(timezone.utc).isoformat()

    return {"store": store_id, "real": is_real, "email": email_entry, "sms": sms_entry}


@api_router.post("/admin/notifications/test-lead")
async def create_test_lead(body: TestLeadCreateRequest, user=Depends(get_current_admin)):
    """Create a fake `store: 'test'` lead to exercise the full new-lead +
    escalation flow end-to-end without ever disturbing a real store, RPV or
    David — every send for is_test leads is routed to TEST_RECIPIENT_*."""
    if body.category not in ("devis", "contact"):
        raise HTTPException(status_code=400, detail="category doit être 'devis' ou 'contact'")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    col_name = COLLECTIONS[body.category]
    doc = {
        "id": str(uuid.uuid4()),
        "created_at": now_str,
        "status": "nouveau",
        "type": body.category,
        "store": TEST_STORE_ID,
        "is_test": True,
        "test_same_person": bool(body.same_person),
        "test_accelerated": bool(body.accelerated),
        "first_name": "TEST",
        "name": "TEST — ne pas traiter",
        "phone": TEST_RECIPIENT_SMS or "0600000000",
        "email": TEST_RECIPIENT_EMAIL or "test@example.com",
        "escalations_sent": [],
        "notifications": [],
        "status_history": [{"status": "nouveau", "at": now_str, "by": "system"}],
        "call_attempts": [], "assigned_to": None, "first_contact_at": None,
        "lost_reason_code": None, "tracking_since": now_str,
    }
    if body.category == "devis":
        doc.update({"device_type": "smartphone", "brand": "Apple", "model": "iPhone TEST", "issue_types": ["Test"], "other_issue": None, "preferred_time": None})
        details = {"Type d'appareil": doc["device_type"], "Marque": doc["brand"], "Modèle": doc["model"], "Problèmes": doc["issue_types"]}
        subject = "[TEST] Nouveau devis — Magasin TEST"
        title = "TEST — Nouvelle demande de devis"
        demand_type_label = "Demande de devis (TEST)"
    else:
        doc.update({"subject": "Test — message", "message": "Ceci est un lead de test, ne pas traiter.",
                    "rdv_device_type": None, "rdv_brand": None, "rdv_model": None, "rdv_issue": None, "rdv_date": None, "rdv_slot": None})
        details = {"Objet": doc["subject"], "Message": doc["message"]}
        subject = "[TEST] Nouveau message — Magasin TEST"
        title = "TEST — Nouveau message"
        demand_type_label = "Message / Contact (TEST)"
    html = build_email_html(
        title=title, demand_type=demand_type_label, store_name="Magasin TEST",
        client={"Nom": doc["name"], "Téléphone": doc["phone"], "Email": doc["email"]},
        details=details, submitted_at=now_fr, demand_id=doc["id"],
    )
    await db[col_name].insert_one(doc)
    asyncio.ensure_future(_notify_lead(col_name, doc["id"], TEST_STORE_ID, subject, html, doc, body.category))
    logger.info(f"[TEST LEAD] Created {body.category}/{doc['id']} (same_person={body.same_person}, accelerated={body.accelerated})")
    return {"status": "success", "id": doc["id"], "category": body.category}


@api_router.post("/admin/notifications/digest-test")
async def send_digest_test(user=Depends(get_current_admin)):
    """Send the daily digest report to TEST_RECIPIENT_EMAIL only, prefixed
    [TEST]. Read-only: never touches leads or escalations_sent."""
    if not TEST_RECIPIENT_EMAIL:
        raise HTTPException(status_code=400, detail="TEST_RECIPIENT_EMAIL non configuré")
    await _send_daily_digest(test_mode=True)
    return {"status": "sent", "to": TEST_RECIPIENT_EMAIL}


@api_router.get("/admin/notifications/health")
async def notifications_health(user=Depends(get_current_admin)):
    async def window_stats(hours: int):
        since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        leads = 0
        sms_sent = sms_failed = 0
        email_sent = email_failed = 0
        leads_without_notification = 0
        for col_name in COLLECTIONS.values():
            docs = await db[col_name].find(
                {"created_at": {"$gte": since}, "is_test": {"$ne": True}}, {"_id": 0, "notifications": 1}
            ).to_list(2000)
            for d in docs:
                leads += 1
                notifs = d.get("notifications") or []
                if not notifs:
                    leads_without_notification += 1
                for n in notifs:
                    if n.get("channel") == "sms" and n.get("kind") == "primary":
                        sms_sent += 1 if n.get("status") == "sent" else 0
                        sms_failed += 1 if n.get("status") != "sent" else 0
                    elif n.get("channel") == "email" and n.get("kind") == "primary":
                        email_sent += 1 if n.get("status") == "sent" else 0
                        email_failed += 1 if n.get("status") != "sent" else 0
        return {
            "leads": leads,
            "sms": {"disabled": True} if not SMS_ENABLED else {"sent": sms_sent, "failed": sms_failed},
            "email": {"sent": email_sent, "failed": email_failed},
            "leads_without_notification": leads_without_notification,
        }

    w24 = await window_stats(24)
    w7d = await window_stats(24 * 7)

    status = "ok"
    if w24["leads"] > 0:
        email_total = w24["email"]["sent"] + w24["email"]["failed"]
        if email_total == 0 or w24["email"]["sent"] == 0:
            status = "down"
        elif email_total and (w24["email"]["failed"] / email_total) > 0.2:
            status = "degraded"
        if SMS_ENABLED:
            sms_total = w24["sms"]["sent"] + w24["sms"]["failed"]
            if sms_total == 0 or w24["sms"]["sent"] == 0:
                status = "down"
            elif sms_total and (w24["sms"]["failed"] / sms_total) > 0.2 and status == "ok":
                status = "degraded"
    return {"window_24h": w24, "window_7d": w7d, "status": status}


@api_router.get("/admin/stats")
async def get_admin_stats(
    store: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user=Depends(get_current_admin),
):
    base_query = {"is_test": {"$ne": True}}
    if store:
        base_query["store"] = store
    if date_from or date_to:
        date_filter = {}
        if date_from:
            date_filter["$gte"] = date_from
        if date_to:
            date_filter["$lte"] = date_to + "T23:59:59.999999"
        base_query["created_at"] = date_filter

    stats = {}
    total_all = 0
    by_status = {"nouveau": 0, "pas_de_reponse": 0, "a_rappeler": 0, "reflechit": 0, "devis_accepte": 0, "rdv_pris": 0,
                 "contacte": 0, "pris_en_charge": 0, "facture": 0, "refus_devis": 0, "client_perdu": 0}
    by_category_status = {}
    for key, col_name in COLLECTIONS.items():
        count = await db[col_name].count_documents(base_query)
        stats[key] = count
        total_all += count
        cat_statuses = {}
        for st in by_status.keys():
            c = await db[col_name].count_documents({**base_query, "status": st})
            by_status[st] += c
            cat_statuses[st] = c
        by_category_status[key] = cat_statuses
    stats["total"] = total_all
    stats["nouveau"] = by_status["nouveau"]
    stats["contacte"] = by_status["contacte"]
    stats["pris_en_charge"] = by_status["pris_en_charge"]
    stats["facture"] = by_status["facture"]
    stats["refus_devis"] = by_status["refus_devis"]
    stats["client_perdu"] = by_status["client_perdu"]
    for st in ("pas_de_reponse", "a_rappeler", "reflechit", "devis_accepte", "rdv_pris"):
        stats[st] = by_status[st]
    stats["by_category_status"] = by_category_status
    return stats

# Keep old routes as aliases for backward compat
def format_date_fr(iso_str: str) -> str:
    """Convert ISO datetime string to DD/MM/YYYY HH:MM format."""
    if not iso_str:
        return ''
    try:
        dt = datetime.strptime(str(iso_str)[:19], '%Y-%m-%dT%H:%M:%S')
        return dt.strftime('%d/%m/%Y %H:%M')
    except Exception:
        return str(iso_str)


@api_router.get("/admin/export-all")
async def export_all_demandes_csv(store: Optional[str] = Query(None), date_from: Optional[str] = Query(None), date_to: Optional[str] = Query(None), status: Optional[str] = Query(None), user=Depends(get_current_admin)):
    """Export all leads from all categories in one unified CSV file."""
    TYPE_LABELS = {"devis": "Devis", "contact": "RDV/Contact", "entreprise": "Entreprise", "rachat": "Rachat"}
    COLUMN_LABELS = {
        "type": "Type", "created_at": "Date de soumission", "status": "Statut",
        "first_name": "Prénom", "name": "Nom", "last_name": "Nom de famille",
        "company": "Société", "email": "Email", "phone": "Téléphone", "store": "Magasin",
        "device_type": "Type d'appareil", "brand": "Marque", "model": "Modèle",
        "issue_types": "Pannes", "other_issue": "Autre panne",
        "subject": "Sujet", "message": "Message",
        "fleet_size": "Flotte", "need_type": "Besoin", "condition": "État",
        "preferred_time": "Horaire préféré",
        "customer_source": "Source client", "customer_feedback": "Avis client",
        "staff_source": "Source technicien", "staff_site_opinion": "Avis site",
        "staff_dislikes": "Points négatifs", "lost_reason": "Raison perte client",
        "first_contact_at": "Premier contact le", "first_contact_delay_min": "Délai 1er contact (min ouvrées)",
        "call_attempts_count": "Nb tentatives", "messages_left_count": "Nb messages laissés",
        "last_call_result": "Dernier résultat d'appel", "lost_reason_code": "Motif de perte (code)",
        "assigned_to": "Traité par",
    }
    query = {"is_test": {"$ne": True}}
    if store:
        query["store"] = store
    if status and status != "all":
        query["status"] = status
    if date_from or date_to:
        df = {}
        if date_from:
            df["$gte"] = date_from
        if date_to:
            df["$lte"] = date_to + "T23:59:59.999999"
        query["created_at"] = df

    all_docs = []
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
        for d in docs:
            d["type"] = TYPE_LABELS.get(category, category)
            _annotate_call_journal_export_fields(d)
        all_docs.extend(docs)

    # Sort all by date desc
    all_docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    # Build ordered columns
    priority = ["type", "created_at", "status", "first_name", "name", "last_name", "company",
                "email", "phone", "store", "device_type", "brand", "model",
                "issue_types", "other_issue", "subject", "message", "fleet_size",
                "need_type", "condition", "preferred_time",
                "customer_source", "customer_feedback",
                "staff_source", "staff_site_opinion", "staff_dislikes", "lost_reason",
                "first_contact_at", "first_contact_delay_min", "call_attempts_count",
                "messages_left_count", "last_call_result", "lost_reason_code", "assigned_to"]
    cols_raw = []
    seen = set()
    for k in priority:
        for d in all_docs:
            if k in d and k not in seen:
                cols_raw.append(k); seen.add(k); break
    # Colonnes internes jamais exportées telles quelles (remplacées par les colonnes calculées ci-dessus)
    seen.update({"status_history", "call_attempts", "tracking_since", "relances", "client_sms", "callback_at",
                 "appt_date", "appt_slot", "appt_start_at", "appt_end_at", "demo"})
    for d in all_docs:
        for k in d.keys():
            if k not in seen and k != "id":
                cols_raw.append(k); seen.add(k)

    cols_fr = [COLUMN_LABELS.get(k, k) for k in cols_raw]

    output = io.StringIO()
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    writer.writerow(cols_fr)
    for d in all_docs:
        row = []
        for k in cols_raw:
            v = d.get(k)
            if k in ("created_at", "first_contact_at"):
                v = format_date_fr(v)
            elif isinstance(v, list):
                v = ', '.join(str(x) for x in v)
            elif v is None:
                v = ''
            row.append(v)
        writer.writerow(row)
    output.seek(0)
    filename = f"repairandco_tous_leads_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@api_router.get("/admin/demandes/{category}/export")
async def export_demandes_csv(category: str, store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    query = {"is_test": {"$ne": True}}
    if store:
        query["store"] = store
    docs = await db[col_name].find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)

    # French-friendly column labels
    COLUMN_LABELS = {
        "created_at": "Date de soumission", "id": "ID", "status": "Statut",
        "first_name": "Prénom", "name": "Nom", "last_name": "Nom de famille",
        "company": "Société", "email": "Email", "phone": "Téléphone", "store": "Magasin",
        "device_type": "Type d'appareil", "brand": "Marque", "model": "Modèle",
        "issue_types": "Pannes", "other_issue": "Autre panne",
        "subject": "Sujet", "message": "Message",
        "fleet_size": "Flotte", "need_type": "Besoin", "condition": "État",
        "preferred_time": "Horaire préféré",
        "customer_source": "Source client", "customer_feedback": "Avis client",
        "staff_source": "Source technicien", "staff_site_opinion": "Avis site",
        "staff_dislikes": "Points négatifs", "lost_reason": "Raison perte client",
        "type": "Type de demande",
    }

    # Build column set — Prénom and Nom in priority order
    priority = ["created_at", "id", "status", "first_name", "name", "last_name", "company",
                "email", "phone", "store", "device_type", "brand", "model",
                "issue_types", "other_issue", "subject", "message", "fleet_size",
                "need_type", "condition", "preferred_time",
                "customer_source", "customer_feedback",
                "staff_source", "staff_site_opinion", "staff_dislikes",
                "lost_reason", "type"]
    columns_raw = []
    seen = set()
    for k in priority:
        for d in docs:
            if k in d and k not in seen:
                columns_raw.append(k); seen.add(k); break
    for d in docs:
        for k in d.keys():
            if k not in seen:
                columns_raw.append(k); seen.add(k)

    # Map to French labels
    columns_fr = [COLUMN_LABELS.get(k, k) for k in columns_raw]

    output = io.StringIO()
    output.write('\ufeff')  # BOM for Excel UTF-8
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_MINIMAL)
    writer.writerow(columns_fr)
    for d in docs:
        row = []
        for k in columns_raw:
            v = d.get(k)
            if isinstance(v, list):
                v = ', '.join(str(x) for x in v)
            elif v is None:
                v = ''
            row.append(v)
        writer.writerow(row)
    output.seek(0)
    filename = f"repairandco_{category}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.get("/admin/demandes-devis")
async def get_demandes_devis_legacy(user=Depends(get_current_admin)):
    return await db.demandes_devis.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/admin/demandes-contact")
async def get_demandes_contact_legacy(user=Depends(get_current_admin)):
    return await db.demandes_contact.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/admin/demandes-entreprise")
async def get_demandes_entreprise_legacy(user=Depends(get_current_admin)):
    return await db.demandes_entreprise.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/admin/demandes-rachat")
async def get_demandes_rachat_legacy(user=Depends(get_current_admin)):
    return await db.demandes_rachat.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ==================== APP CONFIG ====================

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=["*"], allow_headers=["*"])

async def migrate_legacy_statuses():
    """One-shot migration: convert legacy status values to the current 6-status pipeline."""
    total = 0
    for col in COLLECTIONS.values():
        for old, new in LEGACY_STATUS_MAP.items():
            r = await db[col].update_many({"status": old}, {"$set": {"status": new}})
            total += r.modified_count
        # Old "pending" or missing/unknown → contacte
        r = await db[col].update_many({"status": "pending"}, {"$set": {"status": "contacte"}})
        total += r.modified_count
        r = await db[col].update_many(
            {"$or": [{"status": {"$exists": False}}, {"status": None}, {"status": ""}]},
            {"$set": {"status": "nouveau"}},
        )
        total += r.modified_count
    if total:
        logger.info(f"Migrated {total} statuses to 6-status pipeline (contacte/facture/refus_devis...)")


# ==================== ESCALATION & DAILY DIGEST ====================

# Ordre croissant — utilisé pour la détection tardive (n'envoyer que le palier le plus haut atteint).
ESCALATION_TIERS = ["15min", "30min", "2h"]

def _tier_threshold_minutes(doc: dict, tier: str) -> float:
    if doc.get('is_test') and doc.get('test_accelerated'):
        return {"15min": 1, "30min": 2, "2h": 4}[tier]
    return {"15min": 15, "30min": 30, "2h": 120}[tier]

def _tier_done(escalations_sent: list, tier: str) -> bool:
    return tier in escalations_sent or f"{tier}:skipped" in escalations_sent

def _is_business_hours(now_paris: datetime = None) -> bool:
    """Lundi à samedi, 9h-20h Paris. Dimanche toujours fermé."""
    now_paris = now_paris or datetime.now(PARIS_TZ)
    if now_paris.weekday() == 6:  # Sunday
        return False
    return 9 <= now_paris.hour < 20

def _business_minutes_elapsed(start_utc: datetime, end_utc: datetime) -> float:
    """Minutes écoulées entre start et end, comptées uniquement lundi-samedi 9h-20h Paris."""
    if end_utc <= start_utc:
        return 0.0
    cursor = start_utc.astimezone(PARIS_TZ)
    end_paris = end_utc.astimezone(PARIS_TZ)
    total_minutes = 0.0
    guard = 0
    while cursor < end_paris and guard < 400:
        guard += 1
        if cursor.weekday() == 6:  # Sunday closed entirely
            cursor = (cursor + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        day_open = cursor.replace(hour=9, minute=0, second=0, microsecond=0)
        day_close = cursor.replace(hour=20, minute=0, second=0, microsecond=0)
        if cursor < day_open:
            cursor = day_open
            continue
        if cursor >= day_close:
            cursor = (cursor + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        segment_end = min(end_paris, day_close)
        total_minutes += (segment_end - cursor).total_seconds() / 60
        cursor = segment_end
    return total_minutes

def _lead_age_minutes(doc: dict, now_utc: datetime, created_dt: datetime) -> float:
    if doc.get('is_test') and doc.get('test_accelerated'):
        return (now_utc - created_dt).total_seconds() / 60
    return _business_minutes_elapsed(created_dt, now_utc)

def _format_waiting_since(created_dt: datetime, now_utc: datetime) -> str:
    minutes = int((now_utc - created_dt).total_seconds() // 60)
    if minutes < 60:
        return f"{minutes} min"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} h"
    days = hours // 24
    return f"{days} jour{'s' if days > 1 else ''}"

def _lead_details_dict(doc: dict, category: str) -> dict:
    if category == 'devis':
        return {
            "Type d'appareil": doc.get('device_type'), "Marque": doc.get('brand'), "Modèle": doc.get('model'),
            "Problèmes": doc.get('issue_types'), "Autre problème": doc.get('other_issue'),
        }
    if category == 'contact':
        return {
            "Objet": doc.get('subject'), "Type d'appareil": doc.get('rdv_device_type'), "Marque": doc.get('rdv_brand'),
            "Modèle": doc.get('rdv_model'), "Panne": doc.get('rdv_issue'),
            "Date du RDV": doc.get('rdv_date'), "Créneau": doc.get('rdv_slot'), "Message": doc.get('message'),
        }
    if category == 'entreprise':
        return {"Société": doc.get('company'), "Taille de flotte": doc.get('fleet_size'), "Type de besoin": doc.get('need_type')}
    if category == 'rachat':
        return {"Marque": doc.get('brand'), "Modèle": doc.get('model'), "État": CONDITION_LABELS.get(doc.get('condition'), doc.get('condition'))}
    return {}

def _build_escalation_email_html(doc: dict, category: str, tier: str, created_dt: datetime, now_utc: datetime) -> str:
    store_id = doc.get('store') or ''
    store_name = STORE_NAMES.get(store_id, store_id or 'Sans magasin')
    client_name = (
        doc.get('name')
        or " ".join(x for x in [doc.get('first_name'), doc.get('last_name')] if x).strip()
        or doc.get('company')
        or 'Client'
    )
    tier_titles = {"15min": "⏰ Rappel — lead en attente", "2h": "⏰ Lead non traité"}
    action_notes = {
        "15min": "Action requise : rappeler ce client maintenant.",
        "2h": "Action requise : faire rappeler ce client par le magasin.",
    }
    details = _lead_details_dict(doc, category)
    details["En attente depuis"] = _format_waiting_since(created_dt, now_utc)
    return build_email_html(
        title=f"{tier_titles.get(tier, '⏰ Escalade')} — {store_name}",
        demand_type=category,
        store_name=store_name,
        client={"Nom": client_name, "Téléphone": doc.get('phone'), "Email": doc.get('email')},
        details=details,
        submitted_at=format_dt_fr(created_dt),
        demand_id=doc.get("id"),
        action_note=action_notes.get(tier, "Action requise : rappeler ce client maintenant."),
    )

def _build_30min_sms(doc: dict, store_name: str) -> str:
    """Objet imposé : RELANCE - LEAD NON TRAITE - <Magasin> - <Nom> - <tel>"""
    name = (
        doc.get('name')
        or " ".join(x for x in [doc.get('first_name'), doc.get('last_name')] if x).strip()
        or doc.get('company')
        or 'Client'
    )
    phone = doc.get('phone') or ''
    return _strip_accents(f"RELANCE - LEAD NON TRAITE - {store_name} - {name} - {phone}")[:160]

async def _claim_tier(col_name: str, demand_id: str, tier: str) -> bool:
    """Atomic claim: marks `tier` as sent BEFORE sending anything — returns
    True only if this call actually won the claim (tier not already present
    under any process/run). Prevents any double-send at the source."""
    r = await db[col_name].update_one(
        {"id": demand_id, "escalations_sent": {"$nin": [tier, f"{tier}:skipped"]}},
        {"$addToSet": {"escalations_sent": tier}},
    )
    return r.modified_count > 0

async def _mark_tier_skipped(col_name: str, demand_id: str, tier: str):
    await db[col_name].update_one(
        {"id": demand_id, "escalations_sent": {"$nin": [tier, f"{tier}:skipped"]}},
        {"$addToSet": {"escalations_sent": f"{tier}:skipped"}},
    )

async def _send_tier_notification(doc: dict, category: str, col_name: str, demand_id: str, tier: str, store_id: str, created_dt: datetime, now_utc: datetime):
    is_test = bool(doc.get('is_test'))
    same_person = bool(doc.get('test_same_person')) if is_test else (
        bool(store_id) and STORE_ESCALATION_SMS.get(store_id) == STORE_PRIMARY_SMS.get(store_id)
    )
    store_name = STORE_NAMES.get(store_id, store_id or "Sans magasin")
    notif_entries = []

    if tier == "15min":
        sms_target = TEST_RECIPIENT_SMS if is_test else STORE_PRIMARY_SMS.get(store_id)
        email_target = TEST_RECIPIENT_EMAIL if is_test else STORE_EMAIL.get(store_id)
        if sms_target:
            text = build_sms_text(doc, category, prefix="RAPPEL - LEAD EN ATTENTE")
            entry = await send_sms(sms_target, text, kind="escalation_15min")
            if entry:
                notif_entries.append(entry)
        if email_target:
            subject = f"⏰ RAPPEL — lead en attente — {store_name}"
            html = _build_escalation_email_html(doc, category, "15min", created_dt, now_utc)
            entry = await send_email_tracked(email_target, subject, html, kind="escalation_15min")
            if entry:
                notif_entries.append(entry)

    elif tier == "30min":
        if same_person:
            pass  # déjà rappelé à 15 min par la même personne — rien à envoyer
        else:
            sms_target = TEST_RECIPIENT_SMS if is_test else STORE_ESCALATION_SMS.get(store_id)
            if sms_target:
                text = _build_30min_sms(doc, store_name)
                entry = await send_sms(sms_target, text, kind="escalation_30min")
                if entry:
                    notif_entries.append(entry)

    elif tier == "2h":
        email_target = TEST_RECIPIENT_EMAIL if is_test else SUPERVISION_EMAIL
        if email_target:
            subject = f"⏰ LEAD NON TRAITÉ — {store_name}"
            html = _build_escalation_email_html(doc, category, "2h", created_dt, now_utc)
            entry = await send_email_tracked(email_target, subject, html, kind="supervision")
            if entry:
                notif_entries.append(entry)

    if notif_entries:
        await db[col_name].update_one({"id": demand_id}, {"$push": {"notifications": {"$each": notif_entries}}})

async def _run_escalation_once():
    """Runs every 5 minutes. Non-test leads only send between 9h-20h Paris,
    Mon-Sat (age itself is computed in business-minutes so evening leads
    correctly wait until the next open slot). Test-accelerated leads bypass
    both the business-hours gate and the business-minutes age calc so they
    can be verified in real time regardless of when the admin runs the test.
    Late detection: if several tiers are already reached in one pass, only
    the highest is sent; lower ones are marked `<tier>:skipped`. The tier is
    claimed atomically (before sending) so no lead is ever notified twice for
    the same tier, even across overlapping runs."""
    now_utc = datetime.now(timezone.utc)
    now_is_open = _is_business_hours()
    for category, col_name in COLLECTIONS.items():
        if category == "entreprise":
            continue
        docs = await db[col_name].find({"status": "nouveau"}, {"_id": 0}).to_list(500)
        for doc in docs:
            created_at = doc.get("created_at")
            if not created_at:
                continue
            try:
                created_dt = datetime.fromisoformat(created_at)
            except Exception:
                continue
            accelerated_test = bool(doc.get('is_test') and doc.get('test_accelerated'))
            if not accelerated_test and not now_is_open:
                continue
            age_minutes = _lead_age_minutes(doc, now_utc, created_dt)
            store_id = doc.get("store") or ""
            demand_id = doc["id"]
            escalations_sent = doc.get("escalations_sent") or []

            reached_undone = [
                t for t in ESCALATION_TIERS
                if age_minutes >= _tier_threshold_minutes(doc, t) and not _tier_done(escalations_sent, t)
            ]
            if not reached_undone:
                continue
            highest = reached_undone[-1]
            for lower_tier in reached_undone[:-1]:
                await _mark_tier_skipped(col_name, demand_id, lower_tier)

            claimed = await _claim_tier(col_name, demand_id, highest)
            if not claimed:
                continue  # already claimed by another pass — never double-send
            await _send_tier_notification(doc, category, col_name, demand_id, highest, store_id, created_dt, now_utc)

async def _migrate_skip_stale_escalations():
    """Idempotent safety net: any real (non-test) lead already >=2h business-old
    that hasn't fully gone through the tiers gets the missing tiers marked
    `skipped` WITHOUT sending anything — prevents a backlog (old deploy,
    server downtime) from suddenly firing a flood of catch-up escalations."""
    now_utc = datetime.now(timezone.utc)
    for col_name in COLLECTIONS.values():
        docs = await db[col_name].find({"is_test": {"$ne": True}}, {"_id": 0, "id": 1, "created_at": 1, "escalations_sent": 1}).to_list(5000)
        for doc in docs:
            created_at = doc.get("created_at")
            if not created_at:
                continue
            try:
                created_dt = datetime.fromisoformat(created_at)
            except Exception:
                continue
            if _business_minutes_elapsed(created_dt, now_utc) < 120:
                continue
            escalations_sent = doc.get("escalations_sent") or []
            missing = [t for t in ESCALATION_TIERS if not _tier_done(escalations_sent, t)]
            if not missing:
                continue
            await db[col_name].update_one(
                {"id": doc["id"]},
                {"$addToSet": {"escalations_sent": {"$each": [f"{t}:skipped" for t in missing]}}},
            )

async def _cleanup_old_test_leads():
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
    for col_name in COLLECTIONS.values():
        await db[col_name].delete_many({"is_test": True, "created_at": {"$lt": cutoff}})

async def _send_daily_digest(test_mode: bool = False):
    """Sent every day at 8h Paris — even when everything is fine, so a
    digest that stops arriving is itself a signal. test_mode=True sends only
    to TEST_RECIPIENT_EMAIL, objet [TEST], and never touches any lead."""
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    leads = 0
    sms_sent = sms_failed = 0
    email_sent = email_failed = 0
    escalated = 0
    failed_leads = []
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find({"created_at": {"$gte": since}, "is_test": {"$ne": True}}, {"_id": 0}).to_list(2000)
        for d in docs:
            leads += 1
            if d.get("escalations_sent"):
                escalated += 1
            for n in (d.get("notifications") or []):
                if n.get("channel") == "sms" and n.get("kind") == "primary":
                    sms_sent += 1 if n.get("status") == "sent" else 0
                    sms_failed += 1 if n.get("status") != "sent" else 0
                elif n.get("channel") == "email" and n.get("kind") == "primary":
                    email_sent += 1 if n.get("status") == "sent" else 0
                    email_failed += 1 if n.get("status") != "sent" else 0
            if d.get("notify_status") in ("failed", "partial"):
                store_name = STORE_NAMES.get(d.get("store"), d.get("store") or "—")
                client = d.get("name") or d.get("company") or "Client"
                failed_leads.append(f"{category} — {client} — {store_name}")

    email_total = email_sent + email_failed
    sms_total = sms_sent + sms_failed
    status = "ok"
    if leads > 0:
        if email_total == 0 or email_sent == 0:
            status = "down"
        elif email_total and (email_failed / email_total) > 0.2:
            status = "degraded"
        if SMS_ENABLED and (sms_total == 0 or sms_sent == 0):
            status = "down"
        elif SMS_ENABLED and sms_total and (sms_failed / sms_total) > 0.2 and status == "ok":
            status = "degraded"

    subject_prefix = "[TEST] " if test_mode else ("🚨 ALERTE — " if status in ('down', 'degraded') else "")
    subject = f"{subject_prefix}Digest quotidien notifications — {leads} leads (24h)"
    report_lines = [
        f"Leads (24h) : {leads}",
        (f"SMS envoyés : {sms_sent} / échoués : {sms_failed}" if SMS_ENABLED else "SMS : désactivé (SMS_ENABLED=false)"),
        f"Emails envoyés : {email_sent} / échoués : {email_failed}",
        f"Leads escaladés : {escalated}",
    ]
    if failed_leads:
        report_lines.append("Leads en échec de notification :")
        report_lines.extend(f"- {x}" for x in failed_leads)
    html = build_email_html(
        title="Digest quotidien — Notifications" + (" (TEST)" if test_mode else ""),
        demand_type="Rapport de supervision (24h)",
        store_name="Tous magasins",
        client={},
        details={"Statut": status.upper()},
        submitted_at=format_now_fr(),
        demand_id="digest",
        header_note="\n".join(report_lines),
    )
    target = TEST_RECIPIENT_EMAIL if test_mode else SUPERVISION_EMAIL
    if target:
        await send_email_tracked(target, subject, html, kind="supervision" if not test_mode else "primary")
    else:
        logger.warning(f"[DIGEST] {'TEST_RECIPIENT_EMAIL' if test_mode else 'SUPERVISION_EMAIL'} non configuré — digest non envoyé")

_last_digest_date = None

async def _background_scheduler():
    """Runs every 5 minutes: escalation checks + test-lead cleanup + (once/day
    at 8h Paris) the digest."""
    global _last_digest_date
    while True:
        try:
            await _run_escalation_once()
            await _cleanup_old_test_leads()
            now_paris = datetime.now(PARIS_TZ)
            today_str = now_paris.strftime('%Y-%m-%d')
            if now_paris.hour == 8 and _last_digest_date != today_str:
                await _send_daily_digest()
                _last_digest_date = today_str
        except Exception as e:
            logger.error(f"[SCHEDULER] error: {e}")
        await asyncio.sleep(300)

async def _migrate_call_journal_fields():
    """One-shot, idempotent: backfill Journal d'appel fields on legacy leads.
    Adds only the creation entry to status_history — never invents dates."""
    deployment_ts = datetime.now(timezone.utc).isoformat()
    total = 0
    for col_name in COLLECTIONS.values():
        docs = await db[col_name].find({"status_history": {"$exists": False}}, {"_id": 0, "id": 1, "created_at": 1}).to_list(20000)
        for d in docs:
            created_at = d.get("created_at") or deployment_ts
            await db[col_name].update_one(
                {"id": d["id"]},
                {"$set": {
                    "status_history": [{"status": "nouveau", "at": created_at, "by": "system"}],
                    "call_attempts": [], "assigned_to": None, "first_contact_at": None,
                    "lost_reason_code": None, "tracking_since": deployment_ts,
                }},
            )
            total += 1
    if total:
        logger.info(f"[CALL JOURNAL] Migrated {total} legacy leads with base tracking fields (tracking_since={deployment_ts})")

@app.on_event("startup")
async def startup():
    await seed_admin()
    await db.admin_users.create_index("email", unique=True)
    await migrate_legacy_statuses()
    await _migrate_skip_stale_escalations()
    await _migrate_call_journal_fields()
    asyncio.create_task(_background_scheduler())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
