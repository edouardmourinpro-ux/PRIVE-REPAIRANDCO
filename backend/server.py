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
}

# Magasins qui n'acceptent pas de demande (fermés / en travaux).
# Doit rester aligné avec acceptsLeads dans frontend/src/data/stores.js.
CLOSED_STORES = {"beziers"}

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

def _send_smtp_email(subject: str, html_body: str, extra_recipients=None):
    raw = NOTIFY_EMAIL or ""
    recipients = [e.strip() for e in raw.split(',') if e.strip()]
    if extra_recipients:
        for addr in extra_recipients:
            a = (addr or "").strip()
            if a and a not in recipients:
                recipients.append(a)
    logger.info(f"[EMAIL] NOTIFY_EMAIL raw='{raw}' + extra={extra_recipients or []} → recipients={recipients} | subject='{subject}'")
    if not recipients:
        logger.error("[EMAIL] Aucun destinataire configuré dans NOTIFY_EMAIL — email non envoyé.")
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

async def send_notification(subject: str, html_body: str, extra_recipients=None):
    try:
        await asyncio.to_thread(_send_smtp_email, subject, html_body, extra_recipients)
    except Exception as e:
        logger.error(f"[EMAIL] Échec SMTP — sujet='{subject}' erreur={e}")

def build_email_html(*, title: str, demand_type: str, store_name: str, client: dict,
                     details: dict, submitted_at: str, demand_id: str,
                     survey: dict = None, header_note: str = None) -> str:
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
        Action requise : appeler le client dans les 15 minutes.
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
    """Send one email via SMTP, retrying up to 3 times. Returns a
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
            await asyncio.to_thread(_send_smtp_email, subject, html_body, recipients[1:] if len(recipients) > 1 else None)
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
    The HTTP response of the form never waits for this."""
    notifications = []
    recipients = [e.strip() for e in (NOTIFY_EMAIL or "").split(',') if e.strip()]
    for addr in extra_recipients_for_store(store_id):
        if addr and addr not in recipients:
            recipients.append(addr)
    if recipients:
        email_entry = await send_email_tracked(", ".join(recipients), subject, html_body, kind="primary")
        if email_entry:
            notifications.append(email_entry)
    if store_id:
        primary_number = STORE_PRIMARY_SMS.get(store_id)
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

def format_now_fr():
    """Current datetime formatted in French timezone-ish (UTC+2)."""
    now = datetime.now(timezone.utc) + timedelta(hours=2)
    return now.strftime("%d/%m/%Y à %Hh%M")


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
    lost_reason: Optional[str] = None

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

# Allowed status values (Phase 2 — pipeline 6 statuts)
ALLOWED_STATUSES = {"nouveau", "contacte", "pris_en_charge", "facture", "refus_devis", "client_perdu"}
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
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "devis"})
    await db.demandes_devis.insert_one(doc)
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
    if input.store and input.store in CLOSED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store) if input.store else "Non précisé"
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "contact"})
    await db.demandes_contact.insert_one(doc)
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
    if input.store and input.store in CLOSED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store) if input.store else "—"
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "entreprise"})
    await db.demandes_entreprise.insert_one(doc)
    asyncio.ensure_future(_sync_and_persist(
        "demandes_entreprise", doc["id"],
        first_name=doc['first_name'], last_name=doc['last_name'],
        phone=doc['phone'], email=doc['email'],
    ))
    full_name = f"{doc['first_name']} {doc['last_name']}".strip()
    asyncio.ensure_future(_notify_lead(
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
    if input.store in CLOSED_STORES:
        raise HTTPException(status_code=400, detail="Ce magasin est temporairement fermé. Merci de choisir un autre magasin.")
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store)
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "nouveau", "type": "rachat"})
    await db.demandes_rachat.insert_one(doc)
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
    new_status = LEGACY_STATUS_MAP.get(body.status, body.status)
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Statut invalide")
    update_fields = {"status": new_status}
    if body.lost_reason and new_status == "client_perdu":
        update_fields["lost_reason"] = body.lost_reason
    result = await db[col_name].update_one({"id": demand_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "updated"}

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
    query = {"store": store} if store else {}
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


class NotificationsTestRequest(BaseModel):
    store: str


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


@api_router.post("/admin/notifications/test")
async def test_notifications(body: NotificationsTestRequest, user=Depends(get_current_admin)):
    """Send a real test SMS + email to a store's actual recipients — lets the
    admin verify all 9 stores in a few minutes without creating fake leads.
    Single attempt only (no retries) so the button responds quickly."""
    store_id = body.store
    if store_id not in STORE_NAMES:
        raise HTTPException(status_code=400, detail="Magasin inconnu")
    store_name = STORE_NAMES[store_id]
    recipients = [e.strip() for e in (NOTIFY_EMAIL or "").split(',') if e.strip()]
    for addr in extra_recipients_for_store(store_id):
        if addr and addr not in recipients:
            recipients.append(addr)

    email_entry = {"channel": "email", "kind": "primary", "to": ", ".join(recipients), "status": "failed", "attempts": 1}
    try:
        await asyncio.to_thread(
            _send_smtp_email,
            f"[TEST] Notification — {store_name}",
            build_email_html(
                title="TEST — ne pas traiter",
                demand_type="Test de notification (bouton admin)",
                store_name=store_name,
                client={},
                details={"Note": "Ceci est un envoi de test déclenché depuis /admin — ne correspond à aucun client réel."},
                submitted_at=format_now_fr(),
                demand_id="test",
            ),
            recipients[1:] if len(recipients) > 1 else None,
        )
        email_entry["status"] = "sent"
        email_entry["at"] = datetime.now(timezone.utc).isoformat()
    except Exception as e:
        email_entry["error"] = str(e)[:300]
        email_entry["at"] = datetime.now(timezone.utc).isoformat()

    primary_number = STORE_PRIMARY_SMS.get(store_id)
    if not primary_number:
        sms_entry = {"channel": "sms", "status": "skipped", "error": "aucun numéro configuré"}
    elif not SMS_ENABLED:
        sms_entry = {"channel": "sms", "status": "skipped", "error": "SMS_ENABLED=false"}
    elif not _is_french_mobile(primary_number):
        sms_entry = {"channel": "sms", "to": primary_number, "status": "failed", "error": "numero non mobile"}
    else:
        sms_entry = {"channel": "sms", "kind": "primary", "to": primary_number, "status": "failed", "attempts": 1}
        try:
            text = _strip_accents(f"TEST - ne pas traiter\nRepair&Co - Test {store_name}\nrepairandco.fr/admin")
            result = await asyncio.to_thread(_brevo_send_sms_sync, primary_number, text)
            sms_entry["status"] = "sent"
            sms_entry["provider_id"] = result.get("messageId")
            sms_entry["at"] = datetime.now(timezone.utc).isoformat()
        except Exception as e:
            sms_entry["error"] = str(e)[:300]
            sms_entry["at"] = datetime.now(timezone.utc).isoformat()

    return {"store": store_id, "email": email_entry, "sms": sms_entry}


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
                {"created_at": {"$gte": since}}, {"_id": 0, "notifications": 1}
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
    base_query = {}
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
    by_status = {"nouveau": 0, "contacte": 0, "pris_en_charge": 0, "facture": 0, "refus_devis": 0, "client_perdu": 0}
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
    }
    query = {}
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
        all_docs.extend(docs)

    # Sort all by date desc
    all_docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    # Build ordered columns
    priority = ["type", "created_at", "status", "first_name", "name", "last_name", "company",
                "email", "phone", "store", "device_type", "brand", "model",
                "issue_types", "other_issue", "subject", "message", "fleet_size",
                "need_type", "condition", "preferred_time",
                "customer_source", "customer_feedback",
                "staff_source", "staff_site_opinion", "staff_dislikes", "lost_reason"]
    cols_raw = []
    seen = set()
    for k in priority:
        for d in all_docs:
            if k in d and k not in seen:
                cols_raw.append(k); seen.add(k); break
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
            if k == "created_at":
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
    query = {"store": store} if store else {}
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

def _build_escalation_email_html(doc: dict, category: str, tier: str) -> str:
    store_name = STORE_NAMES.get(doc.get('store'), doc.get('store') or 'Non précisé')
    client_name = (
        doc.get('name')
        or " ".join(x for x in [doc.get('first_name'), doc.get('last_name')] if x).strip()
        or doc.get('company')
        or 'Client'
    )
    return build_email_html(
        title="⏰ Lead non traité — Escalade",
        demand_type=category,
        store_name=store_name,
        client={"Nom": client_name, "Téléphone": doc.get('phone'), "Email": doc.get('email')},
        details={"Statut": "Toujours \"nouveau\"", "Palier d'escalade": tier},
        submitted_at=format_now_fr(),
        demand_id=doc.get("id"),
        header_note=f"Ce lead n'a été pris en charge par personne depuis au moins {tier}.",
    )

async def _run_escalation_once():
    """Runs every 5 minutes (see _background_scheduler). Only acts during
    business hours (9h-20h Paris) — a lead created at 21h waits until 9h the
    next day before it ever triggers an SMS or email."""
    if not _is_business_hours():
        return
    now_utc = datetime.now(timezone.utc)
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find({"status": "nouveau"}, {"_id": 0}).to_list(500)
        for doc in docs:
            created_at = doc.get("created_at")
            if not created_at:
                continue
            try:
                created_dt = datetime.fromisoformat(created_at)
            except Exception:
                continue
            age = now_utc - created_dt
            store_id = doc.get("store") or ""
            demand_id = doc["id"]
            escalations_sent = doc.get("escalations_sent") or []

            if age >= timedelta(minutes=30) and "30min" not in escalations_sent:
                primary = STORE_PRIMARY_SMS.get(store_id)
                escalation = STORE_ESCALATION_SMS.get(store_id)
                notif_entries = []
                if store_id and escalation and escalation != primary:
                    text = build_sms_text(doc, category, prefix="RELANCE - LEAD NON TRAITE")
                    entry = await send_sms(escalation, text, kind="escalation")
                    if entry:
                        notif_entries.append(entry)
                elif SUPERVISION_EMAIL:
                    # Même destinataire en primaire et en escalade (ou pas de magasin) :
                    # on saute le SMS et on passe directement à la supervision.
                    entry = await send_email_tracked(
                        SUPERVISION_EMAIL,
                        f"⏰ LEAD NON TRAITÉ — {STORE_NAMES.get(store_id, store_id or 'Sans magasin')}",
                        _build_escalation_email_html(doc, category, "30 minutes"),
                        kind="supervision",
                    )
                    if entry:
                        notif_entries.append(entry)
                await db[col_name].update_one(
                    {"id": demand_id},
                    {"$push": {"notifications": {"$each": notif_entries}}, "$addToSet": {"escalations_sent": "30min"}},
                )

            if age >= timedelta(hours=2) and "2h" not in escalations_sent:
                notif_entries = []
                if SUPERVISION_EMAIL:
                    entry = await send_email_tracked(
                        SUPERVISION_EMAIL,
                        f"⏰ LEAD NON TRAITÉ — {STORE_NAMES.get(store_id, store_id or 'Sans magasin')}",
                        _build_escalation_email_html(doc, category, "2 heures"),
                        kind="supervision",
                    )
                    if entry:
                        notif_entries.append(entry)
                await db[col_name].update_one(
                    {"id": demand_id},
                    {"$push": {"notifications": {"$each": notif_entries}}, "$addToSet": {"escalations_sent": "2h"}},
                )

async def _send_daily_digest():
    """Sent every day at 8h Paris — even when everything is fine, so a
    digest that stops arriving is itself a signal."""
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    leads = 0
    sms_sent = sms_failed = 0
    email_sent = email_failed = 0
    escalated = 0
    failed_leads = []
    for category, col_name in COLLECTIONS.items():
        docs = await db[col_name].find({"created_at": {"$gte": since}}, {"_id": 0}).to_list(2000)
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

    subject = f"{'🚨 ALERTE — ' if status in ('down', 'degraded') else ''}Digest quotidien notifications — {leads} leads (24h)"
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
        title="Digest quotidien — Notifications",
        demand_type="Rapport de supervision (24h)",
        store_name="Tous magasins",
        client={},
        details={"Statut": status.upper()},
        submitted_at=format_now_fr(),
        demand_id="digest",
        header_note="\n".join(report_lines),
    )
    if SUPERVISION_EMAIL:
        await send_email_tracked(SUPERVISION_EMAIL, subject, html, kind="supervision")
    else:
        logger.warning("[DIGEST] SUPERVISION_EMAIL non configuré — digest non envoyé")

_last_digest_date = None

async def _background_scheduler():
    """Runs every 5 minutes: escalation checks + (once/day at 8h Paris) the digest."""
    global _last_digest_date
    while True:
        try:
            await _run_escalation_once()
            now_paris = datetime.now(PARIS_TZ)
            today_str = now_paris.strftime('%Y-%m-%d')
            if now_paris.hour == 8 and _last_digest_date != today_str:
                await _send_daily_digest()
                _last_digest_date = today_str
        except Exception as e:
            logger.error(f"[SCHEDULER] error: {e}")
        await asyncio.sleep(300)

@app.on_event("startup")
async def startup():
    await seed_admin()
    await db.admin_users.create_index("email", unique=True)
    await migrate_legacy_statuses()
    asyncio.create_task(_background_scheduler())

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
