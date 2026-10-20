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
import re
from datetime import datetime, timezone, timedelta, date
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
# S31 (incident 08/10/2026) : garde-fou anti-rafale — nombre max de
# notifications d'escalade envoyées en un seul passage du scheduler (5 min).
MAX_ESCALATIONS_PER_TICK = 20
# Destinataire unique des demandes B2B — hors CRM admin, email direct uniquement.
B2B_EMAIL = os.environ.get('B2B_EMAIL', 'david.m@repairandco.fr')

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
# SMS de service au CLIENT (confirmation création / RDV / passage) — distinct de
# SMS_ENABLED qui gère les SMS vers les magasins/RPV.
CLIENT_SMS_ENABLED = os.environ.get('CLIENT_SMS_ENABLED', 'false').lower() == 'true'
# Interrupteur séparé pour le SMS de confirmation RDV/passage (après un appel
# "Oui, devis accepté"/"RDV pris") — reste à false tant que non validé par
# l'utilisateur, indépendamment de CLIENT_SMS_ENABLED (qui ne gère plus que le
# SMS de création). Code prêt, à rallumer en changeant cette seule variable.
CLIENT_SMS_RDV_ENABLED = os.environ.get('CLIENT_SMS_RDV_ENABLED', 'false').lower() == 'true'

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

def _store_address(store_id: str) -> str:
    """Lit frontend/src/data/stores.js (source unique) pour obtenir l'adresse
    complète d'un magasin — évite de dupliquer les adresses côté backend.
    Si le magasin déménage, un seul endroit à corriger (le frontend)."""
    try:
        stores_js = (ROOT_DIR.parent / "frontend" / "src" / "data" / "stores.js").read_text(encoding="utf-8")
    except Exception:
        return ""
    for block in re.findall(r"\{([^{}]*)\}", stores_js):
        m_id = re.search(r'id:\s*"([^"]+)"', block)
        if not m_id or m_id.group(1) != store_id:
            continue
        m_addr = re.search(r'address:\s*"([^"]*)"', block)
        m_postal = re.search(r'postalCode:\s*"([^"]*)"', block)
        m_city = re.search(r'city:\s*"([^"]*)"', block)
        parts = [p for p in [m_addr.group(1) if m_addr else None, m_postal.group(1) if m_postal else None, m_city.group(1) if m_city else None] if p]
        return ", ".join(parts)
    return ""

def _store_phone(store_id: str) -> str:
    """Lit frontend/src/data/stores.js (source unique) pour obtenir le numéro
    public d'un magasin — injecté dans les SMS clients de confirmation."""
    try:
        stores_js = (ROOT_DIR.parent / "frontend" / "src" / "data" / "stores.js").read_text(encoding="utf-8")
    except Exception:
        return ""
    for block in re.findall(r"\{([^{}]*)\}", stores_js):
        m_id = re.search(r'id:\s*"([^"]+)"', block)
        if not m_id or m_id.group(1) != store_id:
            continue
        m_phone = re.search(r'phone:\s*"([^"]*)"', block)
        return m_phone.group(1) if m_phone else ""
    return ""

# Magasins qui n'acceptent pas de demande (fermés / en travaux) + magasin technique de test.
# Doit rester aligné avec acceptsLeads dans frontend/src/data/stores.js.
CLOSED_STORES = {"beziers"}
# Magasin technique réservé au mode test — absent du frontend (stores.js) ; une
# soumission publique avec store="test" est acceptée mais marquée is_test=True
# automatiquement (isolation totale : TEST_RECIPIENT_*, jamais Hiboutik/stats/digest).
TEST_STORE_ID = "test"

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
        f'<p style="margin:0 0 18px 0;padding:12px 14px;background:#E8F5EE;border-left:3px solid #2ECC71;color:#1A5C3A;font-size:13px;border-radius:6px;white-space:pre-line">{header_note}</p>'
        if header_note else ""
    )
    action_block = (
        f'<p style="color:#1A1A2E;font-size:12px;text-align:center;margin:14px 0 0 0;opacity:.6">{action_note}</p>'
        if action_note else ""
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
      {action_block}
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

def _normalize_fr_mobile(phone: str) -> Optional[str]:
    """Convertit un numéro saisi au format national (ex: 0788809386) vers le
    format international sans + utilisé par Brevo (33788809386). Renvoie
    None si ce n'est pas un mobile français valide."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0") and len(digits) == 10:
        digits = "33" + digits[1:]
    if not digits.startswith("33") or len(digits) != 11:
        return None
    return digits if _is_french_mobile(digits) else None

_SMS_KEEP_ACCENTED = {"é", "è", "à", "ù"}

def _strip_accents(text: str) -> str:
    """SMS content must stay GSM-7 compatible. Only é/è/à/ù are kept as-is ;
    every other accented character (ô, ê, î, û, â, ç, À, É, etc.) is folded
    back to its unaccented form — any one of them flips Brevo's encoding to
    UCS-2 and drops the segment limit from 160 to 70 characters."""
    if not text:
        return ""
    out = []
    for ch in text:
        if ch in _SMS_KEEP_ACCENTED:
            out.append(ch)
            continue
        nfkd = unicodedata.normalize('NFKD', ch)
        base = ''.join(c for c in nfkd if not unicodedata.combining(c))
        out.append(base if base else ch)
    return ''.join(out)

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

class RequestDeletionBody(BaseModel):
    by: str
    reason: str

class RestoreRequest(BaseModel):
    by: str

class ExtendPrisEnChargeRequest(BaseModel):
    by: str
    note: str

class CallLogRequest(BaseModel):
    by: str
    outcome: str  # joint | pas_de_reponse | numero_invalide
    detail: Optional[str] = None  # rdv_pris | devis_accepte | vient_magasin (legacy) | rappeler | refus | reflechit
    appt_date: Optional[str] = None  # AAAA-MM-JJ — requis si detail = rdv_pris | devis_accepte | vient_magasin
    appt_slot: Optional[str] = None  # un des 3 libellés exacts APPT_SLOTS — requis seulement si detail = rdv_pris
    callback_choice: Optional[str] = None  # 1h | 18h | demain_10h | custom
    callback_at: Optional[str] = None
    refus_reason: Optional[str] = None
    quoted_price: Optional[str] = None  # facultatif, detail = reflechit
    # outcome = pas_de_reponse : 4 questions oui/non à la suite, chaque "non" exige sa raison
    rappel_2e: Optional[bool] = None
    rappel_2e_raison: Optional[str] = None
    message_laisse: Optional[bool] = None
    message_laisse_raison: Optional[str] = None
    mail_envoye: Optional[bool] = None
    mail_envoye_raison: Optional[str] = None
    message_envoye: Optional[bool] = None
    message_envoye_raison: Optional[str] = None
    note: Optional[str] = None

class PassageRequest(BaseModel):
    by: str
    venu: bool
    facture: Optional[bool] = None
    pris_en_charge: Optional[bool] = None
    callback_choice: Optional[str] = None
    callback_at: Optional[str] = None
    note: Optional[str] = None

class PhoneUpdateRequest(BaseModel):
    code: str
    by: str
    phone: str

class BackfillTrackingSinceRequest(BaseModel):
    code: str

# Allowed status values (refonte serveur S20 — statut aligné directement sur le résultat d'appel)
ALLOWED_STATUSES = {
    "nouveau", "pas_de_reponse", "a_rappeler", "reflechit", "devis_accepte",
    "rdv_pris", "facture", "refus_devis", "client_perdu",
    # anciens statuts (S14), conservés en lecture pour les demandes déjà en base
    "contacte", "pris_en_charge",
}
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

# ==================== JOURNAL D'APPEL (S18 → refonte serveur S20) ====================

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
CALL_JOINT_DETAILS = {"rdv_pris", "devis_accepte", "vient_magasin", "rappeler", "refus", "reflechit"}
CALLBACK_CHOICES = {"1h", "18h", "demain_10h", "custom", "dans_2_jours", "semaine_prochaine"}

CALL_DETAIL_LABELS = {
    "rdv_pris": "RDV pris", "vient_magasin": "Vient en magasin",
    "devis_accepte": "Devis accepté", "rappeler": "À rappeler", "refus": "Refus",
    "reflechit": "Réfléchit",
}

# detail d'appel joint → statut direct de la demande (S20). "vient_magasin" est
# l'ancien détail (pré-S20), traité comme "devis_accepte" — accepté en lecture
# pour compat, aucun nouveau call ne devrait plus l'envoyer.
CALL_DETAIL_STATUS = {
    "rdv_pris": "rdv_pris",
    "devis_accepte": "devis_accepte",
    "vient_magasin": "devis_accepte",
    "rappeler": "a_rappeler",
    "refus": "refus_devis",
    "reflechit": "reflechit",
}

# Créneaux RDV — libellés exacts affichés sur le site public. Valeurs =
# (heure_debut, min_debut, heure_fin, min_fin) en heure de Paris.
APPT_SLOTS = {
    "Matin (9h30-12h30)": (9, 30, 12, 30),
    "Après-midi (14h-17h)": (14, 0, 17, 0),
    "Fin de journée (17h-19h30)": (17, 0, 19, 30),
}
APPT_SLOT_SHORT = {
    "Matin (9h30-12h30)": "9h30-12h30",
    "Après-midi (14h-17h)": "14h-17h",
    "Fin de journée (17h-19h30)": "17h-19h30",
}
APPT_SLOT_SMS_TEXT = {
    "Matin (9h30-12h30)": "entre 9h30 et 12h30",
    "Après-midi (14h-17h)": "entre 14h et 17h",
    "Fin de journée (17h-19h30)": "entre 17h et 19h30",
}
# "devis_accepte" / "vient_magasin" : passage sans créneau fixe → fenêtre horaire type (9h-20h).
PASSAGE_WINDOW = (9, 0, 20, 0)

# Statuts pour lesquels un lead n'a plus besoin d'être appelé (onglet "À appeler" — S19/S20).
# "pris_en_charge" (S32) n'est PAS exclu de l'onglet "À appeler" lui-même — il
# est juste invisible tant que son garde-fou de 7 jours n'est pas atteint (voir
# TO_CALL_EXCLUDED_STATUSES et le groupe 10 dans /admin/to-call).
NON_CALLABLE_STATUSES = {"pris_en_charge", "facture", "refus_devis", "client_perdu"}
TO_CALL_EXCLUDED_STATUSES = NON_CALLABLE_STATUSES - {"pris_en_charge"}

FR_WEEKDAY_ABBR = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]

def _format_fr_date_short(d: date) -> str:
    """Ex: 'ven. 25/09' — jour abrégé + date, utilisé dans l'onglet À appeler et les SMS client."""
    return f"{FR_WEEKDAY_ABBR[d.weekday()]} {d.strftime('%d/%m')}"

def _compute_appt_window(appt_date: str, start_h: int, start_m: int, end_h: int, end_m: int):
    """Calcule le début/fin de créneau en Europe/Paris puis renvoie (start_iso_utc, end_iso_utc)."""
    d = datetime.strptime(appt_date, "%Y-%m-%d").date()
    start_paris = datetime(d.year, d.month, d.day, start_h, start_m, tzinfo=PARIS_TZ)
    end_paris = datetime(d.year, d.month, d.day, end_h, end_m, tzinfo=PARIS_TZ)
    return start_paris.astimezone(timezone.utc).isoformat(), end_paris.astimezone(timezone.utc).isoformat()

def _require_callback_at(choice: Optional[str], custom_at: Optional[str]) -> str:
    """Comme _resolve_callback_at mais lève une 400 si le choix est absent/invalide."""
    if choice not in CALLBACK_CHOICES:
        raise HTTPException(status_code=400, detail="Choix de rappel invalide")
    if choice == "custom" and not custom_at:
        raise HTTPException(status_code=400, detail="Date de rappel requise")
    return _resolve_callback_at(choice, custom_at)

def _default_reflechit_callback_at() -> str:
    """Sans choix explicite : replanifie à 10h, 2 jours ouvrés plus tard (dimanche fermé)."""
    d = datetime.now(PARIS_TZ).date()
    added = 0
    while added < 2:
        d += timedelta(days=1)
        if d.weekday() != 6:
            added += 1
    dt = datetime(d.year, d.month, d.day, 10, 0, tzinfo=PARIS_TZ)
    return dt.astimezone(timezone.utc).isoformat()

def _is_client_creation_daytime(now_paris: datetime = None) -> bool:
    """Lundi-samedi, 9h-18h Paris — fenêtre utilisée pour choisir le texte du SMS de création."""
    now_paris = now_paris or datetime.now(PARIS_TZ)
    return now_paris.weekday() != 6 and 9 <= now_paris.hour < 18

def _finalize_client_sms(core: str, closing: str, closing_short: str = "") -> str:
    """Assemble le SMS avec sa formule de politesse finale. Si le total dépasse
    160 caractères, on raccourcit UNIQUEMENT cette formule (voire on la
    retire) — jamais le magasin, l'adresse, le téléphone ou la date, qui
    restent entiers quoi qu'il arrive."""
    text = _strip_accents(core + closing)
    if len(text) <= 160:
        return text
    if closing_short:
        text_short = _strip_accents(core + closing_short)
        if len(text_short) <= 160:
            return text_short
    return _strip_accents(core)

def _build_client_creation_sms(store_id: str) -> str:
    store_name = STORE_NAMES.get(store_id, store_id or "")
    phone = _store_phone(store_id)
    phone_clause = f" depuis le {phone}" if phone else ""
    if _is_client_creation_daytime():
        core = f"Bonjour, Repair&Co {store_name}. Votre demande est bien arrivée ! On vous rappelle dans l'heure{phone_clause}."
    else:
        core = f"Bonjour, Repair&Co {store_name}. Votre demande est bien arrivée ! On vous rappelle dès l'ouverture à 9h{phone_clause}."
    return _finalize_client_sms(core, " Merci de rester joignable !", " Restez joignable !")

def _build_client_appt_sms(appt_type: str, appt_date: str, appt_slot: Optional[str], store_name: str, store_address: str) -> str:
    d = datetime.strptime(appt_date, "%Y-%m-%d").date()
    date_short = _format_fr_date_short(d)
    where = f"{store_name}, {store_address}" if store_address else store_name
    if appt_type == "rdv":
        slot_text = APPT_SLOT_SMS_TEXT.get(appt_slot, "")
        core = f"Bonjour, votre RDV Repair&Co est confirmé le {date_short} {slot_text} au magasin de {where}."
        return _finalize_client_sms(core, " On vous attend !")
    core = f"Bonjour, on vous attend le {date_short} au magasin Repair&Co de {where}."
    return _strip_accents(core)

async def _send_client_sms(collection_name: str, demand_id: str, phone: str, sms_type: str, text: str) -> None:
    """Envoie un SMS de service au client (jamais de promo/lien), avec garde
    anti-doublon (1 confirmation du même type par demande et par 24h) et
    persistance dans client_sms[]. Tâche de fond — ne lève jamais. Le ou les
    interrupteurs (CLIENT_SMS_ENABLED / CLIENT_SMS_RDV_ENABLED) sont vérifiés
    par l'appelant, pas ici, pour que chaque type de SMS client ait son propre
    interrupteur indépendant."""
    number = _normalize_fr_mobile(phone)
    if not number:
        return
    doc = await db[collection_name].find_one({"id": demand_id}, {"_id": 0, "client_sms": 1})
    if doc:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        for existing in (doc.get("client_sms") or []):
            if existing.get("type") == sms_type:
                try:
                    if datetime.fromisoformat(existing["at"]) >= cutoff:
                        return
                except Exception:
                    pass
    try:
        result = await asyncio.to_thread(_brevo_send_sms_sync, number, text)
        entry = {"type": sms_type, "to": number, "status": "sent", "provider_id": result.get("messageId"), "at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        entry = {"type": sms_type, "to": number, "status": "failed", "error": str(e)[:300], "at": datetime.now(timezone.utc).isoformat()}
    try:
        await db[collection_name].update_one({"id": demand_id}, {"$push": {"client_sms": entry}})
    except Exception as e:
        logger.error(f"[CLIENT SMS] Échec persistance ({collection_name}/{demand_id}): {e}")

async def _send_client_creation_sms(collection_name: str, demand_id: str, phone: Optional[str], store_id: str) -> None:
    if not CLIENT_SMS_ENABLED or not phone:
        return
    await _send_client_sms(collection_name, demand_id, phone, "creation", _build_client_creation_sms(store_id))

async def _send_client_appt_sms(collection_name: str, demand_id: str, phone: Optional[str], appt_type: str, appt_date: str, appt_slot: Optional[str], store_id: str) -> None:
    if not CLIENT_SMS_RDV_ENABLED or not phone:
        return
    store_name = STORE_NAMES.get(store_id, store_id or "")
    store_address = _store_address(store_id)
    sms_type = "rdv" if appt_type == "rdv" else "passage"
    text = _build_client_appt_sms(appt_type, appt_date, appt_slot, store_name, store_address)
    await _send_client_sms(collection_name, demand_id, phone, sms_type, text)

def _format_paris_hhmm(dt: datetime) -> str:
    p = dt.astimezone(PARIS_TZ)
    return f"{p.hour:02d}h{p.minute:02d}"

def _is_in_tracked_pipeline(doc: dict) -> bool:
    """Un lead rejoint le suivi complet (« À appeler », règle des 6 appels,
    etc.) s'il est postérieur au début du suivi (tracking_since), OU s'il a
    déjà au moins un appel journalisé (une équipe l'a touché) — dès ce
    premier appel il suit les mêmes règles que tous les autres leads."""
    created_at = doc.get("created_at")
    tracking_since = doc.get("tracking_since")
    is_tracked = bool(created_at and tracking_since and created_at >= tracking_since)
    return is_tracked or bool(doc.get("call_attempts"))

def _unreachable_rule_satisfied(doc: dict) -> bool:
    """« Injoignable » exige >= 6 appels "pas de réponse" — mais SEULEMENT
    pour les leads réellement suivis : un lead ancien (créé avant
    tracking_since) ET jamais encore appelé depuis le déploiement est
    bypassé (de vrais appels ont pu être faits avant d'être journalisés).
    Dès qu'un premier appel est journalisé sur ce lead, il rejoint le suivi
    normal et la règle des 6 appels s'applique comme pour les autres."""
    if not _is_in_tracked_pipeline(doc):
        return True
    count = sum(1 for c in (doc.get("call_attempts") or []) if c.get("outcome") == "pas_de_reponse")
    return count >= 6

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
    elif choice == "dans_2_jours":
        dt = (now_paris + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
    elif choice == "semaine_prochaine":
        dt = (now_paris + timedelta(days=7)).replace(hour=10, minute=0, second=0, microsecond=0)
    elif choice == "custom":
        return custom_at
    else:
        return None
    return dt.astimezone(timezone.utc).isoformat()

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
        return "Pas de réponse — message laissé" if entry.get("message_laisse") else "Pas de réponse — sans message"
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
    if input.store in CLOSED_STORES:
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
        "passages": [], "phone_changes": [], "client_sms": [], "relances": [],
        "appt_type": None, "appt_date": None, "appt_slot": None,
        "appt_start_at": None, "appt_end_at": None, "next_callback_at": None,
    })
    if doc["store"] == TEST_STORE_ID:
        doc["is_test"] = True
    await db.demandes_devis.insert_one(doc)
    if not doc.get("is_test"):
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
    asyncio.ensure_future(_send_client_creation_sms("demandes_devis", doc["id"], doc.get("phone"), doc.get("store")))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/contact")
async def create_contact(input: ContactRequestCreate):
    if input.store and input.store in CLOSED_STORES:
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
        "passages": [], "phone_changes": [], "client_sms": [], "relances": [],
        "appt_type": None, "appt_date": None, "appt_slot": None,
        "appt_start_at": None, "appt_end_at": None, "next_callback_at": None,
    })
    if doc.get("store") == TEST_STORE_ID:
        doc["is_test"] = True
    await db.demandes_contact.insert_one(doc)
    if not doc.get("is_test"):
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
    asyncio.ensure_future(_send_client_creation_sms("demandes_contact", doc["id"], doc.get("phone"), doc.get("store")))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/b2b")
async def create_b2b(input: B2BRequestCreate):
    if input.store and input.store in CLOSED_STORES:
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
        "passages": [], "phone_changes": [], "client_sms": [], "relances": [],
        "appt_type": None, "appt_date": None, "appt_slot": None,
        "appt_start_at": None, "appt_end_at": None, "next_callback_at": None,
    })
    await db.demandes_entreprise.insert_one(doc)
    asyncio.ensure_future(_sync_and_persist(
        "demandes_entreprise", doc["id"],
        first_name=doc['first_name'], last_name=doc['last_name'],
        phone=doc['phone'], email=doc['email'],
    ))
    full_name = f"{doc['first_name']} {doc['last_name']}".strip()
    # B2B est hors CRM admin : la demande est archivée en base (demandes_entreprise,
    # retirée de COLLECTIONS) mais un seul email direct part à B2B_EMAIL — aucun SMS,
    # aucun routage magasin, aucune escalade.
    asyncio.ensure_future(send_email_tracked(
        B2B_EMAIL,
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
        kind="b2b",
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/buyback")
async def create_buyback(input: BuybackRequestCreate):
    if input.store in CLOSED_STORES:
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
        "passages": [], "phone_changes": [], "client_sms": [], "relances": [],
        "appt_type": None, "appt_date": None, "appt_slot": None,
        "appt_start_at": None, "appt_end_at": None, "next_callback_at": None,
    })
    if doc["store"] == TEST_STORE_ID:
        doc["is_test"] = True
    await db.demandes_rachat.insert_one(doc)
    if not doc.get("is_test"):
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
    asyncio.ensure_future(_send_client_creation_sms("demandes_rachat", doc["id"], doc.get("phone"), doc.get("store")))
    return {"status": "success", "id": doc["id"]}


# ==================== ADMIN ROUTES ====================

COLLECTIONS = {
    "devis": "demandes_devis",
    "contact": "demandes_contact",
    "rachat": "demandes_rachat",
}

@api_router.get("/admin/demandes/{category}")
async def get_demandes(category: str, store: Optional[str] = Query(None), date_from: Optional[str] = Query(None), date_to: Optional[str] = Query(None), status: Optional[str] = Query(None), user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    query = {"deletion_requested": None}
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
    if new_status == "pris_en_charge":
        # L'appareil est au magasin : plus de rappel/RDV en attente (S32).
        update_fields.update({
            "next_callback_at": None, "appt_type": None, "appt_date": None,
            "appt_slot": None, "appt_start_at": None, "appt_end_at": None,
        })
    if new_status in ("client_perdu", "refus_devis") and body.lost_reason_code:
        if body.lost_reason_code not in LOST_REASON_CODES:
            raise HTTPException(status_code=400, detail="Motif de perte invalide")
        if new_status == "client_perdu" and body.lost_reason_code == "injoignable" and not _unreachable_rule_satisfied(doc):
            raise HTTPException(status_code=400, detail="Il faut 6 appels « Pas de réponse » avant de classer Injoignable.")
        update_fields["lost_reason_code"] = body.lost_reason_code
    if body.lost_reason:
        update_fields["lost_reason"] = body.lost_reason
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

    appt_date = appt_slot = appt_type = None
    appt_start_at = appt_end_at = None
    callback_at = None
    lost_reason_code = None

    if body.outcome == "joint":
        detail = body.detail
        if detail not in CALL_JOINT_DETAILS:
            raise HTTPException(status_code=400, detail="Détail d'appel invalide")

        if detail in ("rdv_pris", "devis_accepte", "vient_magasin"):
            if not body.appt_date:
                raise HTTPException(status_code=400, detail="Date de rendez-vous/passage requise")
            try:
                datetime.strptime(body.appt_date, "%Y-%m-%d")
            except ValueError:
                raise HTTPException(status_code=400, detail="Date invalide (format AAAA-MM-JJ attendu)")
            appt_date = body.appt_date
            if detail == "rdv_pris":
                if body.appt_slot not in APPT_SLOTS:
                    raise HTTPException(status_code=400, detail="Créneau invalide")
                appt_slot = body.appt_slot
                appt_type = "rdv"
                sh, sm, eh, em = APPT_SLOTS[appt_slot]
            else:
                appt_type = "passage"
                sh, sm, eh, em = PASSAGE_WINDOW
            appt_start_at, appt_end_at = _compute_appt_window(appt_date, sh, sm, eh, em)

        if detail == "rappeler":
            callback_at = _require_callback_at(body.callback_choice, body.callback_at)
        elif detail == "reflechit":
            callback_at = _require_callback_at(body.callback_choice, body.callback_at) if body.callback_choice else _default_reflechit_callback_at()
        if detail == "refus" and body.refus_reason not in REFUS_REASON_CODES:
            raise HTTPException(status_code=400, detail="Motif de refus invalide")

        new_status = CALL_DETAIL_STATUS[detail]
        if new_status == "refus_devis":
            lost_reason_code = body.refus_reason

    elif body.outcome == "pas_de_reponse":
        for flag_field, reason_field, question in [
            ("rappel_2e", "rappel_2e_raison", "avez-vous rappelé une 2e fois"),
            ("message_laisse", "message_laisse_raison", "message vocal laissé"),
            ("mail_envoye", "mail_envoye_raison", "email envoyé au client"),
            ("message_envoye", "message_envoye_raison", "WhatsApp envoyé au client"),
        ]:
            value = getattr(body, flag_field)
            if value is None:
                raise HTTPException(status_code=400, detail=f"Réponse manquante — {question} ?")
            if value is False and not (getattr(body, reason_field) or "").strip():
                raise HTTPException(status_code=400, detail=f"Raison manquante — pourquoi « non » à « {question} » ?")
        new_status = "pas_de_reponse"

    else:  # numero_invalide
        new_status = "client_perdu"
        lost_reason_code = "numero_invalide"

    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    if body.outcome == "pas_de_reponse":
        count_pdr = sum(1 for c in (doc.get("call_attempts") or []) if c.get("outcome") == "pas_de_reponse") + 1
        callback_at = _pas_de_reponse_next_callback_at(now_dt, count_pdr)
    entry = {
        "at": now_iso, "by": by, "outcome": body.outcome, "detail": body.detail,
        "refus_reason": body.refus_reason if body.detail == "refus" else None,
        "note": (body.note or "").strip() or None,
    }
    if body.outcome == "pas_de_reponse":
        entry.update({
            "rappel_2e": body.rappel_2e, "rappel_2e_raison": (body.rappel_2e_raison or "").strip() or None,
            "message_laisse": body.message_laisse, "message_laisse_raison": (body.message_laisse_raison or "").strip() or None,
            "mail_envoye": body.mail_envoye, "mail_envoye_raison": (body.mail_envoye_raison or "").strip() or None,
            "message_envoye": body.message_envoye, "message_envoye_raison": (body.message_envoye_raison or "").strip() or None,
        })
    if callback_at:
        entry["callback_at"] = callback_at
    if appt_date:
        entry["appt_date"] = appt_date
        entry["appt_slot"] = appt_slot
    if body.detail == "reflechit" and (body.quoted_price or "").strip():
        entry["quoted_price"] = body.quoted_price.strip()

    set_fields = {"status": new_status, "next_callback_at": callback_at}
    if lost_reason_code:
        set_fields["lost_reason_code"] = lost_reason_code
    if appt_date:
        set_fields.update({
            "appt_type": appt_type, "appt_date": appt_date, "appt_slot": appt_slot,
            "appt_start_at": appt_start_at, "appt_end_at": appt_end_at,
        })
    if body.detail == "reflechit" and (body.quoted_price or "").strip():
        set_fields["quoted_price"] = body.quoted_price.strip()
    if not doc.get("first_contact_at"):
        set_fields["first_contact_at"] = now_iso
    if not doc.get("assigned_to"):
        set_fields["assigned_to"] = by

    await db[col_name].update_one(
        {"id": demand_id},
        {"$set": set_fields, "$push": {"call_attempts": entry, "status_history": {"status": new_status, "at": now_iso, "by": by}}},
    )

    if appt_date:
        asyncio.ensure_future(_send_client_appt_sms(col_name, demand_id, doc.get("phone"), appt_type, appt_date, appt_slot, doc.get("store")))

    return {
        "status": "logged",
        "new_status": new_status,
        "call_attempts_count": len(doc.get("call_attempts") or []) + 1,
    }


class RelanceRequest(BaseModel):
    by: str
    channel: str  # email | whatsapp

RELANCE_CHANNELS = {"email", "whatsapp"}

@api_router.post("/admin/demandes/{category}/{demand_id}/relance")
async def log_relance(category: str, demand_id: str, body: RelanceRequest, user=Depends(get_current_admin)):
    """Trace une relance manuelle (email/WhatsApp envoyé à la main par un staff).
    Ne change jamais le statut ni la prochaine action — une relance n'est pas un appel."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante — merci de préciser qui relance")
    if body.channel not in RELANCE_CHANNELS:
        raise HTTPException(status_code=400, detail="Canal de relance invalide")

    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    now_iso = datetime.now(timezone.utc).isoformat()
    entry = {"at": now_iso, "by": by, "channel": body.channel}
    set_fields = {}
    if not doc.get("first_contact_at"):
        set_fields["first_contact_at"] = now_iso
    if not doc.get("assigned_to"):
        set_fields["assigned_to"] = by

    update_op = {"$push": {"relances": entry}}
    if set_fields:
        update_op["$set"] = set_fields
    await db[col_name].update_one({"id": demand_id}, update_op)
    return {"status": "logged"}


@api_router.post("/admin/demandes/{category}/{demand_id}/passage")
async def log_passage(category: str, demand_id: str, body: PassageRequest, user=Depends(get_current_admin)):
    """Enregistre un passage en magasin (venu ou no-show) et referme le RDV/passage en cours.
    Depuis S32 : « est-il venu ? » propose 3 issues directes — pris en charge
    (l'appareil reste au magasin, plus de rappel), facturé, ou non venu."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante — merci de préciser qui enregistre le passage")

    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    now_iso = datetime.now(timezone.utc).isoformat()
    callback_at = None
    facture = None

    if body.venu:
        if body.pris_en_charge:
            new_status = "pris_en_charge"
            facture = False
        else:
            new_status = "facture"
            facture = True
    else:
        new_status = "a_rappeler"
        callback_at = _require_callback_at(body.callback_choice, body.callback_at)

    entry = {
        "at": now_iso, "by": by, "venu": bool(body.venu), "facture": facture,
        "pris_en_charge": bool(body.pris_en_charge) if body.venu else False,
        "note": (body.note or "").strip() or None,
    }

    set_fields = {
        "status": new_status, "next_callback_at": callback_at,
        "appt_type": None, "appt_date": None, "appt_slot": None, "appt_start_at": None, "appt_end_at": None,
    }
    if not doc.get("assigned_to"):
        set_fields["assigned_to"] = by

    await db[col_name].update_one(
        {"id": demand_id},
        {"$set": set_fields, "$push": {"passages": entry, "status_history": {"status": new_status, "at": now_iso, "by": by}}},
    )
    return {"status": "logged", "new_status": new_status}


def _is_valid_fr_phone(phone: str) -> bool:
    """Accepte un numéro français (fixe ou mobile) au format national ou international."""
    digits = re.sub(r"\D", "", phone or "")
    if digits.startswith("0") and len(digits) == 10:
        return True
    if digits.startswith("33") and len(digits) == 11:
        return True
    return False

@api_router.patch("/admin/demandes/{category}/{demand_id}/phone")
async def update_phone(category: str, demand_id: str, body: PhoneUpdateRequest, user=Depends(get_current_admin)):
    """Corrige le numéro de téléphone d'une demande — protégé par le code de sécurité, journalisé.
    Si la demande avait été classée perdue pour numéro invalide, elle revient automatiquement
    dans « À appeler » (statut nouveau)."""
    if body.code != DELETE_CODE:
        raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante")
    new_phone = (body.phone or "").strip()
    if not new_phone:
        raise HTTPException(status_code=400, detail="Numéro de téléphone requis")
    if not _is_valid_fr_phone(new_phone):
        raise HTTPException(status_code=400, detail="Numéro de téléphone invalide (10 chiffres, ex: 06 12 34 56 78)")

    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")

    now_iso = datetime.now(timezone.utc).isoformat()
    entry = {"at": now_iso, "by": by, "old_phone": doc.get("phone"), "new_phone": new_phone}
    set_fields = {"phone": new_phone}
    new_status = None
    if doc.get("status") == "client_perdu" and doc.get("lost_reason_code") == "numero_invalide":
        new_status = "nouveau"
        set_fields["status"] = new_status
        set_fields["lost_reason_code"] = None
    push_op = {"phone_changes": entry}
    if new_status:
        push_op["status_history"] = {"status": new_status, "at": now_iso, "by": by}
    await db[col_name].update_one(
        {"id": demand_id},
        {"$set": set_fields, "$push": push_op},
    )
    return {"status": "updated", "new_status": new_status}

@api_router.delete("/admin/demandes/{category}/{demand_id}")
async def delete_demand(category: str, demand_id: str, body: DeleteRequest, user=Depends(get_current_admin)):
    """Suppression DÉFINITIVE — réservée à la vue Corbeille (direction),
    toujours protégée par le code de sécurité. L'équipe ne passe plus jamais
    par ici : elle utilise /request-deletion (S32)."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    if body.code != DELETE_CODE:
        raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    result = await db[col_name].delete_one({"id": demand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "deleted"}

@api_router.post("/admin/demandes/{category}/{demand_id}/request-deletion")
async def request_deletion(category: str, demand_id: str, body: RequestDeletionBody, user=Depends(get_current_admin)):
    """Corbeille (S32) : une équipe demande la suppression d'une ligne (raison
    obligatoire, pas de code de sécurité). Ne supprime rien — la demande
    disparaît juste de toutes les vues équipe (filtre deletion_requested=None
    appliqué partout) jusqu'à validation par la direction dans la Corbeille."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante")
    reason = (body.reason or "").strip()
    if not reason:
        raise HTTPException(status_code=400, detail="Raison obligatoire")
    result = await db[col_name].update_one(
        {"id": demand_id},
        {"$set": {"deletion_requested": {"at": datetime.now(timezone.utc).isoformat(), "by": by, "reason": reason}}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "requested"}

@api_router.post("/admin/demandes/{category}/{demand_id}/restore")
async def restore_demand(category: str, demand_id: str, body: RestoreRequest, user=Depends(get_current_admin)):
    """Corbeille (S32) : annule une demande de suppression — la ligne
    réapparaît immédiatement dans toutes les vues équipe, rien d'autre
    n'est modifié (son statut n'a jamais changé pendant la mise en attente)."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante")
    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0, "deletion_requested": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if not doc.get("deletion_requested"):
        raise HTTPException(status_code=400, detail="Cette demande n'est pas en attente de suppression")
    restore_entry = {
        "action": "restored", "at": datetime.now(timezone.utc).isoformat(), "by": by,
        "requested_by": doc["deletion_requested"].get("by"),
        "requested_at": doc["deletion_requested"].get("at"),
        "reason": doc["deletion_requested"].get("reason"),
    }
    await db[col_name].update_one(
        {"id": demand_id},
        {"$set": {"deletion_requested": None}, "$push": {"deletion_history": restore_entry}},
    )
    return {"status": "restored"}

@api_router.get("/admin/corbeille")
async def get_corbeille(store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    """Corbeille (S32), réservée à la direction côté UI : liste des demandes
    de suppression en attente de validation. Lecture seule — ne supprime et
    ne restaure rien."""
    query = {"deletion_requested": {"$ne": None}}
    if store == TEST_STORE_ID:
        query["is_test"] = True
        query["store"] = TEST_STORE_ID
    elif store:
        query["is_test"] = {"$ne": True}
        query["store"] = store
    items = []
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find(query, {"_id": 0}).to_list(500)
        for d in docs:
            label = (
                d.get("name")
                or " ".join(x for x in [d.get("first_name"), d.get("last_name")] if x).strip()
                or d.get("company")
                or "Client"
            )
            items.append({
                "id": d["id"], "category": category, "store": d.get("store"),
                "store_name": STORE_NAMES.get(d.get("store"), d.get("store") or ""),
                "label": label, "phone": d.get("phone"), "email": d.get("email"),
                "deletion_requested": d.get("deletion_requested"),
            })
    items.sort(key=lambda it: (it.get("deletion_requested") or {}).get("at", ""), reverse=True)
    return items

@api_router.post("/admin/demandes/{category}/{demand_id}/pris-en-charge/extend")
async def extend_pris_en_charge(category: str, demand_id: str, body: ExtendPrisEnChargeRequest, user=Depends(get_current_admin)):
    """Garde-fou « Pris en charge » (S32) : relance l'horloge de 7 jours quand
    la réparation n'est pas encore facturée, avec une explication obligatoire.
    Ne change jamais le statut (déjà pris_en_charge)."""
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    by = (body.by or "").strip()
    if not by:
        raise HTTPException(status_code=400, detail="Identité manquante")
    note = (body.note or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="Explication obligatoire")
    doc = await db[col_name].find_one({"id": demand_id}, {"_id": 0, "status": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    if doc.get("status") != "pris_en_charge":
        raise HTTPException(status_code=400, detail="Cette demande n'est plus au statut Pris en charge")
    await db[col_name].update_one(
        {"id": demand_id},
        {"$push": {"status_history": {"status": "pris_en_charge", "at": datetime.now(timezone.utc).isoformat(), "by": by, "note": note}}},
    )
    return {"status": "extended"}

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
    if store == TEST_STORE_ID:
        query = {"is_test": True, "store": TEST_STORE_ID}
    elif store:
        query["store"] = store
    items = []
    for demand_type, col_name in COLLECTIONS.items():
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
    """Qui appeler maintenant — agrège devis/contact/rachat (jamais Entreprise,
    hors CRM), applique les 10 groupes métier (S20-S32) répartis en 3 sections
    (maintenant / plus tard aujourd'hui / à classer). Lecture seule."""
    now_utc = datetime.now(timezone.utc)
    today_paris = now_utc.astimezone(PARIS_TZ).date()
    query = {"status": {"$nin": list(TO_CALL_EXCLUDED_STATUSES)}, "deletion_requested": None}
    if store == TEST_STORE_ID:
        query["is_test"] = True
        query["store"] = TEST_STORE_ID
    else:
        query["is_test"] = {"$ne": True}
        query["store"] = {"$ne": TEST_STORE_ID}
        if store:
            query["store"] = store

    GROUP_SECTION = {1: "maintenant", 2: "maintenant", 3: "maintenant", 7: "maintenant", 8: "maintenant",
                      5: "plus_tard", 9: "plus_tard", 4: "a_classer", 6: "a_classer", 10: "a_classer"}

    items = []
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find(query, {"_id": 0}).to_list(2000)
        for d in docs:
            created_at = d.get("created_at")
            call_attempts = d.get("call_attempts") or []
            if not created_at or not _is_in_tracked_pipeline(d):
                continue
            try:
                created_dt = datetime.fromisoformat(created_at)
            except Exception:
                continue

            status = d.get("status") or "nouveau"
            next_callback_at = d.get("next_callback_at")
            group, label = None, None

            if status in ("a_rappeler", "reflechit") and next_callback_at:
                try:
                    cb_dt = datetime.fromisoformat(next_callback_at)
                    cb_label = "Relance du devis prévue" if status == "reflechit" else "Rappel prévu"
                    if cb_dt <= now_utc:
                        group, label = 1, f"{cb_label} à {_format_paris_hhmm(cb_dt)} (en retard)"
                    elif cb_dt.astimezone(PARIS_TZ).date() == today_paris:
                        group, label = 5, f"{cb_label} à {_format_paris_hhmm(cb_dt)}"
                except Exception:
                    pass

            if group is None and status == "nouveau":
                group, label = 2, f"Nouvelle demande, attend depuis {_format_waiting_since(created_dt, now_utc)}"

            if group is None and status == "pas_de_reponse":
                count_pdr = sum(1 for c in call_attempts if c.get("outcome") == "pas_de_reponse")
                if count_pdr >= 6:
                    group, label = 4, f"{count_pdr} appels sans réponse"
                elif call_attempts:
                    try:
                        last_call_dt = datetime.fromisoformat(call_attempts[-1]["at"])
                        is_due = False
                        if next_callback_at:
                            is_due = datetime.fromisoformat(next_callback_at) <= now_utc
                        else:
                            # Reprise ancien calcul (docs antérieurs à S32, sans next_callback_at stocké).
                            is_due = _business_minutes_elapsed(last_call_dt, now_utc) > 180
                        if is_due:
                            last_date_short = last_call_dt.astimezone(PARIS_TZ).strftime('%d/%m')
                            group, label = 3, f"{count_pdr + 1}e appel (pas de réponse le {last_date_short} à {_format_paris_hhmm(last_call_dt)})"
                    except Exception:
                        pass

            if group is None and status == "reflechit":
                count_r = sum(1 for c in call_attempts if c.get("detail") == "reflechit")
                if count_r >= 3:
                    group, label = 6, f"Réfléchit toujours après {count_r - 1} relances"

            if group is None and status in ("devis_accepte", "rdv_pris") and d.get("appt_end_at") and d.get("appt_date"):
                try:
                    end_dt = datetime.fromisoformat(d["appt_end_at"])
                    is_rdv = status == "rdv_pris"
                    date_short = _format_fr_date_short(datetime.strptime(d["appt_date"], "%Y-%m-%d").date())
                    if (now_utc - end_dt) >= timedelta(hours=1):
                        if is_rdv:
                            slot_short = APPT_SLOT_SHORT.get(d.get("appt_slot"), d.get("appt_slot") or "")
                            group, label = 8, f"RDV du {date_short} ({slot_short}) passé : le client est-il venu ?"
                        else:
                            group, label = 7, f"Il devait passer le {date_short} : est-il venu ?"
                    elif d["appt_date"] == today_paris.isoformat():
                        if is_rdv:
                            slot_short = APPT_SLOT_SHORT.get(d.get("appt_slot"), d.get("appt_slot") or "")
                            group, label = 9, f"RDV aujourd'hui, {slot_short}"
                        else:
                            group, label = 9, "Passe au magasin aujourd'hui"
                except Exception:
                    pass

            if group is None and status == "pris_en_charge":
                history = d.get("status_history") or []
                pec_entries = [h for h in history if h.get("status") == "pris_en_charge"]
                if pec_entries:
                    try:
                        pec_dt = datetime.fromisoformat(pec_entries[-1]["at"])
                        if (now_utc - pec_dt) >= timedelta(days=7):
                            date_short = pec_dt.astimezone(PARIS_TZ).strftime('%d/%m')
                            group, label = 10, f"Appareil pris en charge le {date_short} : la réparation a-t-elle été facturée ?"
                    except Exception:
                        pass

            if group is None:
                continue

            item = dict(d)
            item["category"] = category
            item["section"] = GROUP_SECTION[group]
            item["group"] = group
            item["label"] = label
            item["call_attempts_count"] = len(call_attempts)
            item["store_name"] = STORE_NAMES.get(d.get("store"), d.get("store") or "")
            items.append(item)

    SECTION_ORDER = {"maintenant": 0, "plus_tard": 1, "a_classer": 2}
    items.sort(key=lambda it: (SECTION_ORDER[it["section"]], it["group"], it.get("created_at") or ""))
    return items


@api_router.get("/admin/to-call/older-open-count")
async def get_older_open_count(store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    """Demandes encore ouvertes (nouveau/contacte/pris_en_charge) créées avant
    le début du suivi complet ET jamais appelées — donc absentes de « À
    appeler ». Lecture seule, sert uniquement au message affiché quand la
    liste est vide."""
    query = {"status": {"$in": ["nouveau", "contacte", "pris_en_charge"]}, "deletion_requested": None}
    if store == TEST_STORE_ID:
        query["is_test"] = True
        query["store"] = TEST_STORE_ID
    else:
        query["is_test"] = {"$ne": True}
        query["store"] = {"$ne": TEST_STORE_ID}
        if store:
            query["store"] = store

    count = 0
    for col_name in COLLECTIONS.values():
        docs = await db[col_name].find(query, {"_id": 0, "created_at": 1, "tracking_since": 1, "call_attempts": 1}).to_list(5000)
        for d in docs:
            if not _is_in_tracked_pipeline(d):
                count += 1
    return {"count": count}


@api_router.post("/admin/migrate/backfill-tracking-since")
async def backfill_tracking_since(body: BackfillTrackingSinceRequest, user=Depends(get_current_admin)):
    """Opération ponctuelle (one-off, post-déploiement S20) : pour les demandes
    devis/contact/rachat au statut 'nouveau', créées il y a moins de 7 jours
    (fenêtre figée dans le code, non paramétrable), sans tracking_since ou
    avec un tracking_since postérieur à created_at, pose tracking_since =
    created_at — pour qu'elles réapparaissent dans « À appeler ». Jamais le
    magasin TEST, jamais un autre statut que 'nouveau'. Idempotente (un 2e
    appel ne trouve plus rien à corriger). Verrouillée par DELETE_CODE en
    plus de l'auth admin ; journalise le résultat à chaque appel."""
    if body.code != DELETE_CODE:
        raise HTTPException(status_code=403, detail="Code de sécurité incorrect")
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    by_store: dict = {}
    by_category: dict = {}
    total = 0
    for category, col_name in COLLECTIONS.items():
        query = {"status": "nouveau", "created_at": {"$gte": cutoff}, "is_test": {"$ne": True}}
        docs = await db[col_name].find(query, {"_id": 0, "id": 1, "created_at": 1, "tracking_since": 1, "store": 1}).to_list(10000)
        cat_count = 0
        for d in docs:
            created_at = d.get("created_at")
            tracking_since = d.get("tracking_since")
            if not created_at:
                continue
            if tracking_since and tracking_since <= created_at:
                continue
            await db[col_name].update_one({"id": d["id"]}, {"$set": {"tracking_since": created_at}})
            store_id = d.get("store") or "inconnu"
            by_store[store_id] = by_store.get(store_id, 0) + 1
            cat_count += 1
            total += 1
        by_category[category] = cat_count
    logger.info(f"[MIGRATION backfill-tracking-since] total={total} by_category={by_category} by_store={by_store}")
    return {"total": total, "by_category": by_category, "by_store": by_store}



@api_router.get("/admin/transfo")
async def get_transfo(store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    """Taux de conversion (facturé / total) sur 30 jours glissants — devis,
    contact/RDV, rachat uniquement (jamais Entreprise, hors CRM)."""
    days = 30
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    total = 0
    facture = 0
    for cat in ("devis", "contact", "rachat"):
        col_name = COLLECTIONS[cat]
        query = {"created_at": {"$gte": since}, "deletion_requested": None}
        if store == TEST_STORE_ID:
            query["is_test"] = True
            query["store"] = TEST_STORE_ID
        else:
            query["is_test"] = {"$ne": True}
            if store:
                query["store"] = store
        docs = await db[col_name].find(query, {"_id": 0, "status": 1}).to_list(20000)
        for d in docs:
            total += 1
            if d.get("status") == "facture":
                facture += 1
    rate = round((facture / total) * 100) if total else 0
    return {"days": days, "total": total, "facture": facture, "rate": rate}

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
    primary_number = TEST_RECIPIENT_SMS if doc.get("is_test") else STORE_PRIMARY_SMS.get(store_id)
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
        docs = await db[col_name].find({"status": "nouveau"}, {"_id": 0}).to_list(500)
        for doc in docs:
            store_id = doc.get("store", "")
            primary_number = TEST_RECIPIENT_SMS if doc.get("is_test") else STORE_PRIMARY_SMS.get(store_id)
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
                    title="TEST, ne pas traiter",
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
        "name": "TEST, ne pas traiter",
        "phone": TEST_RECIPIENT_SMS or "0600000000",
        "email": TEST_RECIPIENT_EMAIL or "test@example.com",
        "escalations_sent": [],
        "notifications": [],
        "status_history": [{"status": "nouveau", "at": now_str, "by": "system"}],
        "call_attempts": [], "assigned_to": None, "first_contact_at": None,
        "lost_reason_code": None, "tracking_since": now_str,
        "passages": [], "phone_changes": [], "client_sms": [], "relances": [],
        "appt_type": None, "appt_date": None, "appt_slot": None,
        "appt_start_at": None, "appt_end_at": None, "next_callback_at": None,
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
    base_query = {"deletion_requested": None}
    if store == TEST_STORE_ID:
        base_query["is_test"] = True
        base_query["store"] = TEST_STORE_ID
    else:
        base_query["is_test"] = {"$ne": True}
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
    by_status = {s: 0 for s in ALLOWED_STATUSES}
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
    stats.update(by_status)
    stats["by_category_status"] = by_category_status

    # Entreprise (B2B) : détail brut par statut uniquement — jamais dans les
    # totaux agrégés ci-dessus (hors CRM, hors mécanique d'escalade/SMS).
    entreprise_query = dict(base_query)
    cat_statuses = {}
    for st in ALLOWED_STATUSES:
        cat_statuses[st] = await db.demandes_entreprise.count_documents({**entreprise_query, "status": st})
    by_category_status["entreprise"] = cat_statuses
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
    seen.update({"status_history", "call_attempts", "tracking_since"})
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

def _add_business_minutes(start_utc: datetime, minutes: float) -> datetime:
    """Avance de `minutes` minutes ouvrées (lun-sam 9h-20h Paris) à partir de
    start_utc, en sautant les dimanches et les heures de fermeture. Utilisé
    pour le 1er palier de relance « pas de réponse » (S32 : 3h ouvrées)."""
    cursor = start_utc.astimezone(PARIS_TZ)
    remaining = minutes
    guard = 0
    while guard < 400:
        guard += 1
        if cursor.weekday() == 6:
            cursor = (cursor + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        day_open = cursor.replace(hour=9, minute=0, second=0, microsecond=0)
        day_close = cursor.replace(hour=20, minute=0, second=0, microsecond=0)
        if cursor < day_open:
            cursor = day_open
        if cursor >= day_close:
            cursor = (cursor + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        available = (day_close - cursor).total_seconds() / 60
        if remaining <= available:
            cursor = cursor + timedelta(minutes=remaining)
            remaining = 0
            break
        remaining -= available
        cursor = (cursor + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    return cursor.astimezone(timezone.utc)

def _roll_to_next_opening(dt_paris: datetime) -> datetime:
    """Si dt tombe un dimanche ou hors 9h-20h (lun-sam), reporte à l'ouverture
    suivante (9h) — règle demandée par les équipes (S32) pour la cadence de
    relance « pas de réponse »."""
    guard = 0
    while guard < 14:
        guard += 1
        if dt_paris.weekday() == 6:
            dt_paris = (dt_paris + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        if dt_paris.hour < 9:
            dt_paris = dt_paris.replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        if dt_paris.hour >= 20:
            dt_paris = (dt_paris + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            continue
        break
    return dt_paris

# Cadence de relance "pas de réponse" (S32, demande équipes après 2 semaines
# d'usage réel) — étalée sur 7 jours au lieu de toutes les 3h ouvrées pour ne
# pas consommer les 6 tentatives en 2 jours. count_pdr = nombre total
# d'appels "pas de réponse" déjà enregistrés APRÈS celui qui vient d'être
# loggé. None à partir du 6e (le lead bascule en "à classer", plus de relance
# programmée).
PDR_CADENCE_CALENDAR_DAYS = {2: 1, 3: 2, 4: 4, 5: 7}

def _pas_de_reponse_next_callback_at(last_call_utc: datetime, count_pdr: int) -> Optional[str]:
    if count_pdr == 1:
        return _add_business_minutes(last_call_utc, 180).isoformat()
    calendar_days = PDR_CADENCE_CALENDAR_DAYS.get(count_pdr)
    if calendar_days is None:
        return None
    last_paris = last_call_utc.astimezone(PARIS_TZ)
    target_date = last_paris.date() + timedelta(days=calendar_days)
    target_paris = datetime(target_date.year, target_date.month, target_date.day, 10, 0, tzinfo=PARIS_TZ)
    target_paris = _roll_to_next_opening(target_paris)
    return target_paris.astimezone(timezone.utc).isoformat()

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
    the same tier, even across overlapping runs. S31 safety cap: at most
    MAX_ESCALATIONS_PER_TICK notifications per call — an unexpected backlog
    degrades gracefully (rest picked up on the next tick) instead of firing
    a flood of emails/SMS in one go."""
    now_utc = datetime.now(timezone.utc)
    now_is_open = _is_business_hours()
    sent_this_tick = 0
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find({"status": "nouveau"}, {"_id": 0}).to_list(500)
        for doc in docs:
            if sent_this_tick >= MAX_ESCALATIONS_PER_TICK:
                logger.warning(f"[ESCALATION] cap de {MAX_ESCALATIONS_PER_TICK}/tick atteint — reste traité au prochain passage (5 min)")
                return
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
            sent_this_tick += 1

async def _migrate_skip_stale_escalations():
    """Idempotent safety net: any lead (test OR real — S31: la fuite ne
    protégeait que les leads réels, pas Magasin TEST) déjà >=2h business-old
    et qui n'a pas fini ses paliers reçoit les paliers manquants marqués
    `skipped` SANS rien envoyer — empêche un arriéré (ancien déploiement,
    coupure serveur) de déclencher soudain une rafale d'escalades de
    rattrapage au redémarrage."""
    now_utc = datetime.now(timezone.utc)
    for col_name in COLLECTIONS.values():
        docs = await db[col_name].find({}, {"_id": 0, "id": 1, "created_at": 1, "escalations_sent": 1}).to_list(5000)
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
    for col_name in list(COLLECTIONS.values()) + ["demandes_entreprise"]:
        await db[col_name].delete_many({"is_test": True, "created_at": {"$lt": cutoff}})

async def _send_daily_digest(test_mode: bool = False):
    """Sent exactly once/day at 8h Paris — the "already sent today" guard is
    an atomic Mongo upsert in _background_scheduler (not an in-memory flag),
    so a worker restart or several workers never send it twice. Even when
    everything is fine, so a digest that stops arriving is itself a signal.
    test_mode=True sends only to TEST_RECIPIENT_EMAIL, objet [TEST], and
    never touches any lead."""
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    leads = 0
    email_sent = email_failed = 0
    escalated = 0
    failed_leads = []
    store_received: dict = {}
    store_called: dict = {}
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find({"created_at": {"$gte": since}, "is_test": {"$ne": True}}, {"_id": 0}).to_list(2000)
        for d in docs:
            leads += 1
            store_id = d.get("store") or "inconnu"
            store_received[store_id] = store_received.get(store_id, 0) + 1
            if d.get("call_attempts"):
                store_called[store_id] = store_called.get(store_id, 0) + 1
            if d.get("escalations_sent"):
                escalated += 1
            for n in (d.get("notifications") or []):
                if n.get("channel") == "email" and n.get("kind") == "primary":
                    email_sent += 1 if n.get("status") == "sent" else 0
                    email_failed += 1 if n.get("status") != "sent" else 0
            if d.get("notify_status") in ("failed", "partial"):
                store_name = STORE_NAMES.get(d.get("store"), d.get("store") or "inconnu")
                client = d.get("name") or d.get("company") or "Client"
                failed_leads.append(f"{category}, {client}, {store_name}")

    email_total = email_sent + email_failed

    # Taux de transfo 30j par magasin (facturé / total, devis+contact+rachat).
    since_30d = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    store_transfo_total: dict = {}
    store_transfo_facture: dict = {}
    for col_name in COLLECTIONS.values():
        docs = await db[col_name].find({"created_at": {"$gte": since_30d}, "is_test": {"$ne": True}}, {"_id": 0, "store": 1, "status": 1}).to_list(20000)
        for d in docs:
            store_id = d.get("store") or "inconnu"
            store_transfo_total[store_id] = store_transfo_total.get(store_id, 0) + 1
            if d.get("status") == "facture":
                store_transfo_facture[store_id] = store_transfo_facture.get(store_id, 0) + 1

    status = "ok"
    if leads > 0:
        if email_total == 0 or email_sent == 0:
            status = "down"
        elif email_total and (email_failed / email_total) > 0.2:
            status = "degraded"

    subject_prefix = "[TEST] " if test_mode else ("🚨 ALERTE, " if status in ('down', 'degraded') else "")
    subject = f"{subject_prefix}Digest quotidien notifications, {leads} leads (24h)"
    report_lines = [
        f"Leads (24h) : {leads}",
        f"Emails envoyés : {email_sent} / échoués : {email_failed}",
        f"Leads escaladés : {escalated}",
        "",
        "Par magasin (reçues 24h / avec appel noté / sans appel, puis taux de transfo 30j) :",
    ]
    for store_id, store_label in STORE_NAMES.items():
        if store_id == TEST_STORE_ID:
            continue
        received = store_received.get(store_id, 0)
        called = store_called.get(store_id, 0)
        not_called = received - called
        t_total = store_transfo_total.get(store_id, 0)
        t_facture = store_transfo_facture.get(store_id, 0)
        t_rate = round((t_facture / t_total) * 100) if t_total else 0
        report_lines.append(
            f"- {store_label} : {received} reçue(s), {called} avec appel, {not_called} sans appel, transfo 30j {t_rate}% ({t_facture}/{t_total})"
        )
    if failed_leads:
        report_lines.append("")
        report_lines.append("Leads en échec de notification :")
        report_lines.extend(f"- {x}" for x in failed_leads)
    html = build_email_html(
        title="Digest quotidien, Notifications" + (" (TEST)" if test_mode else ""),
        demand_type="Rapport de supervision (24h)",
        store_name="Tous magasins",
        client={},
        details={"Statut": status.upper()},
        submitted_at=format_now_fr(),
        demand_id="digest",
        header_note="\n".join(report_lines),
        action_note="",
    )
    target = TEST_RECIPIENT_EMAIL if test_mode else SUPERVISION_EMAIL
    if target:
        await send_email_tracked(target, subject, html, kind="supervision" if not test_mode else "primary")
    else:
        logger.warning(f"[DIGEST] {'TEST_RECIPIENT_EMAIL' if test_mode else 'SUPERVISION_EMAIL'} non configuré, digest non envoyé")

async def _background_scheduler():
    """Runs every 5 minutes: escalation checks + test-lead cleanup + (once/day
    at 8h Paris) the digest. The "already sent today" guard lives in Mongo
    (collection system_state, _id=last_digest_date) via un $max atomique :
    même avec plusieurs workers ou un redémarrage pendant l'heure 8h, un seul
    envoi par jour (un flag en mémoire se réinitialise au redémarrage, d'où
    le double envoi du 07/10)."""
    while True:
        try:
            await _run_escalation_once()
            await _cleanup_old_test_leads()
            now_paris = datetime.now(PARIS_TZ)
            today_str = now_paris.strftime('%Y-%m-%d')
            if now_paris.hour == 8:
                previous = await db.system_state.find_one_and_update(
                    {"_id": "last_digest_date"},
                    {"$max": {"date": today_str}},
                    upsert=True,
                )
                already_sent_today = bool(previous and previous.get("date") == today_str)
                if not already_sent_today:
                    await _send_daily_digest()
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

async def _migrate_refactor_fields_v2():
    """One-shot, idempotent: backfill the S20 refactor fields (passage, téléphone,
    SMS client, RDV) on leads created before this refactor. Never overwrites
    existing values — only fills missing ones."""
    new_fields = {
        "passages": [], "phone_changes": [], "client_sms": [], "relances": [],
        "appt_type": None, "appt_date": None, "appt_slot": None,
        "appt_start_at": None, "appt_end_at": None, "next_callback_at": None,
    }
    for col_name in COLLECTIONS.values():
        await db[col_name].update_many({"passages": {"$exists": False}}, {"$set": new_fields})

@app.on_event("startup")
async def startup():
    await seed_admin()
    await db.admin_users.create_index("email", unique=True)
    await migrate_legacy_statuses()
    await _migrate_skip_stale_escalations()
    await _migrate_call_journal_fields()
    await _migrate_refactor_fields_v2()
    asyncio.create_task(_background_scheduler())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
