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
from datetime import datetime, timezone, timedelta

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

# UltraMsg WhatsApp config
ULTRAMSG_INSTANCE = os.environ.get('ULTRAMSG_INSTANCE')
ULTRAMSG_TOKEN = os.environ.get('ULTRAMSG_TOKEN')

# Mapping magasin ID → numéro WhatsApp
STORE_WHATSAPP = {
    "lattes": "33788809386",
    "montpellier-nord": "33987136893",
    "montpellier-sud": "33467588139",
    "nimes-costieres": "33757532389",
    "nimes-etoile": "33466848079",
    "beziers": "33467943034",
    "boulogne": "33767118896",
    "plaisir": "33130438907",
    "les-ulis": "33749952472",
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

def _send_smtp_email(subject: str, html_body: str):
    recipients = [e.strip() for e in NOTIFY_EMAIL.split(',') if e.strip()]
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, recipients, msg.as_string())

async def send_notification(subject: str, html_body: str):
    try:
        await asyncio.to_thread(_send_smtp_email, subject, html_body)
        logger.info(f"Email sent: {subject}")
    except Exception as e:
        logger.error(f"Email send failed: {e}")

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

    meta_rows = _row("Type de demande", demand_type) + _row("Magasin", store_name) + _row("Soumis le", submitted_at) + _row("ID demande", demand_id)
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


# ==================== WHATSAPP ====================

async def send_whatsapp(store_id: str, message: str):
    if not ULTRAMSG_INSTANCE or not ULTRAMSG_TOKEN:
        return
    to_number = STORE_WHATSAPP.get(store_id)
    if not to_number:
        return
    try:
        await asyncio.to_thread(_send_ultramsg, to_number, message)
        logger.info(f"WhatsApp sent to {store_id} ({to_number})")
    except Exception as e:
        logger.error(f"WhatsApp send failed ({store_id}): {e}")

def _send_ultramsg(to_number: str, message: str):
    url = f"https://api.ultramsg.com/{ULTRAMSG_INSTANCE}/messages/chat"
    payload = {'token': ULTRAMSG_TOKEN, 'to': to_number, 'body': message}
    headers = {'content-type': 'application/x-www-form-urlencoded'}
    resp = http_requests.post(url, data=payload, headers=headers, timeout=15)
    result = resp.json()
    if result.get('sent') != 'true':
        raise Exception(f"UltraMsg error: {result}")
    return result

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
    name: str
    phone: str
    email: EmailStr
    store: str
    preferred_time: Optional[str] = None

class ContactRequestCreate(BaseModel):
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

class BuybackRequestCreate(BaseModel):
    brand: str
    model: str
    condition: str
    name: str
    phone: str
    store: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateStatusRequest(BaseModel):
    status: str

class CustomerSurveyRequest(BaseModel):
    customer_source: Optional[str] = None
    customer_feedback: Optional[str] = None

class StaffFeedbackRequest(BaseModel):
    staff_source: Optional[str] = None
    staff_site_opinion: Optional[str] = None
    staff_dislikes: Optional[str] = None

# Allowed status values (Phase 1 simplification)
ALLOWED_STATUSES = {"en_attente", "pris_en_charge", "cloture"}
# Map legacy → new
LEGACY_STATUS_MAP = {
    "nouveau": "en_attente",
    "contacte": "pris_en_charge",
    "rdv_fixe": "pris_en_charge",
    "repare": "cloture",
    "annule": "cloture",
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
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store)
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "en_attente", "type": "devis"})
    await db.demandes_devis.insert_one(doc)
    asyncio.ensure_future(send_notification(
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
        )
    ))
    asyncio.ensure_future(send_whatsapp(input.store,
        f"🚨 *Nouvelle demande - Repair&Co*\n"
        f"- *Date* : {now_fr}\n"
        f"- *Type* : Demande de devis\n"
        f"- *Client* : {doc['name']}\n"
        f"- *Tél* : {doc['phone']}\n"
        f"- *Email* : {doc['email']}\n"
        f"- *Appareil* : {doc['device_type']} {doc['brand']} {doc['model']}\n"
        f"- *Problème* : {', '.join(doc['issue_types'])}\n"
        f"- *Magasin* : {store_name}\n\n"
        f"👉 *Lien Admin* : https://repairandco.fr/admin\n"
        f"👉 *Action requise* : Appeler le client dans les *15 minutes*."
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/contact")
async def create_contact(input: ContactRequestCreate):
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store) if input.store else "Non précisé"
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "en_attente", "type": "contact"})
    await db.demandes_contact.insert_one(doc)
    is_rdv = bool(doc.get('rdv_device_type') or doc.get('rdv_brand') or (doc.get('subject') or '').startswith('RDV'))
    demand_label = "RDV" if is_rdv else "message"
    asyncio.ensure_future(send_notification(
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
        )
    ))
    if doc.get('store'):
        rdv_date = doc.get('rdv_date') or ''
        rdv_slot = doc.get('rdv_slot') or ''
        rdv_info = f"- *RDV souhaité* : {rdv_date} — {rdv_slot}\n" if rdv_date else ""
        free_msg = (doc.get('message') or '').strip() or 'Aucun'
        asyncio.ensure_future(send_whatsapp(doc['store'],
            f"🚨 *Nouvelle demande - Repair&Co*\n"
            f"- *Date* : {now_fr}\n"
            f"- *Type* : {'RDV' if is_rdv else 'Message / Contact'}\n"
            f"- *Client* : {doc['name']}\n"
            f"- *Tél* : {doc.get('phone') or 'Non précisé'}\n"
            f"- *Email* : {doc['email']}\n"
            f"- *Objet* : {doc['subject']}\n"
            f"- *Magasin* : {store_name}\n"
            f"{rdv_info}"
            f"- *Message* : {free_msg}\n\n"
            f"👉 *Lien Admin* : https://repairandco.fr/admin\n"
            f"👉 *Action requise* : Appeler le client dans les *15 minutes*."
        ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/b2b")
async def create_b2b(input: B2BRequestCreate):
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "en_attente", "type": "entreprise"})
    await db.demandes_entreprise.insert_one(doc)
    full_name = f"{doc['first_name']} {doc['last_name']}".strip()
    asyncio.ensure_future(send_notification(
        f"[Repair&Co] Nouveau B2B — {full_name} — {doc['company']}",
        build_email_html(
            title="Demande Services Entreprise",
            demand_type="Demande B2B / Entreprise",
            store_name="—",
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
        )
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/buyback")
async def create_buyback(input: BuybackRequestCreate):
    now_str = datetime.now(timezone.utc).isoformat()
    now_fr = format_now_fr()
    store_name = STORE_NAMES.get(input.store, input.store)
    doc = input.model_dump()
    doc.update({"id": str(uuid.uuid4()), "created_at": now_str, "status": "en_attente", "type": "rachat"})
    await db.demandes_rachat.insert_one(doc)
    asyncio.ensure_future(send_notification(
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
        )
    ))
    asyncio.ensure_future(send_whatsapp(input.store,
        f"🚨 *Nouvelle demande - Repair&Co*\n"
        f"- *Date* : {now_fr}\n"
        f"- *Type* : Demande de rachat\n"
        f"- *Client* : {doc['name']}\n"
        f"- *Tél* : {doc['phone']}\n"
        f"- *Appareil* : {doc['brand']} {doc['model']}\n"
        f"- *État* : {CONDITION_LABELS.get(doc['condition'], doc['condition'])}\n"
        f"- *Magasin* : {store_name}\n\n"
        f"👉 *Lien Admin* : https://repairandco.fr/admin\n"
        f"👉 *Action requise* : Appeler le client dans les *15 minutes*."
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
async def get_demandes(category: str, store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    query = {}
    if store:
        query["store"] = store
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
    result = await db[col_name].update_one({"id": demand_id}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Demande non trouvée")
    return {"status": "updated"}

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

@api_router.get("/admin/stats")
async def get_admin_stats(store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    query = {"store": store} if store else {}
    stats = {}
    total_all = 0
    by_status = {"en_attente": 0, "pris_en_charge": 0, "cloture": 0}
    for key, col_name in COLLECTIONS.items():
        count = await db[col_name].count_documents(query)
        stats[key] = count
        total_all += count
        # Per-status counts (post-migration only the 3 new statuses exist)
        for st in by_status.keys():
            c = await db[col_name].count_documents({**query, "status": st})
            by_status[st] += c
    stats["total"] = total_all
    stats["en_attente"] = by_status["en_attente"]
    stats["pris_en_charge"] = by_status["pris_en_charge"]
    stats["cloture"] = by_status["cloture"]
    return stats

# Keep old routes as aliases for backward compat
@api_router.get("/admin/demandes/{category}/export")
async def export_demandes_csv(category: str, store: Optional[str] = Query(None), user=Depends(get_current_admin)):
    col_name = COLLECTIONS.get(category)
    if not col_name:
        raise HTTPException(status_code=400, detail="Catégorie invalide")
    query = {"store": store} if store else {}
    docs = await db[col_name].find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)

    # Build column set across all docs (preserves first-seen order)
    columns = []
    seen = set()
    priority = ["created_at", "id", "status", "name", "first_name", "last_name", "company",
                "email", "phone", "store", "device_type", "brand", "model",
                "issue_types", "other_issue", "subject", "message", "fleet_size",
                "need_type", "condition", "preferred_time",
                "customer_source", "customer_feedback",
                "staff_source", "staff_site_opinion", "staff_dislikes", "type"]
    for k in priority:
        for d in docs:
            if k in d and k not in seen:
                columns.append(k); seen.add(k); break
    for d in docs:
        for k in d.keys():
            if k not in seen:
                columns.append(k); seen.add(k)

    output = io.StringIO()
    output.write('\ufeff')  # BOM for Excel UTF-8
    writer = csv.DictWriter(output, fieldnames=columns, delimiter=';', extrasaction='ignore')
    writer.writeheader()
    for d in docs:
        row = {}
        for k in columns:
            v = d.get(k)
            if isinstance(v, list):
                v = ', '.join(str(x) for x in v)
            elif v is None:
                v = ''
            row[k] = v
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
    """One-shot migration: convert legacy status values to the simplified set."""
    total = 0
    for col in COLLECTIONS.values():
        for old, new in LEGACY_STATUS_MAP.items():
            r = await db[col].update_many({"status": old}, {"$set": {"status": new}})
            total += r.modified_count
        # Old "pending" or missing/unknown → en_attente
        r = await db[col].update_many({"status": "pending"}, {"$set": {"status": "en_attente"}})
        total += r.modified_count
        r = await db[col].update_many(
            {"$or": [{"status": {"$exists": False}}, {"status": None}, {"status": ""}]},
            {"$set": {"status": "en_attente"}},
        )
        total += r.modified_count
    if total:
        logger.info(f"Migrated {total} legacy statuses to en_attente/pris_en_charge/cloture")

@app.on_event("startup")
async def startup():
    await seed_admin()
    await db.admin_users.create_index("email", unique=True)
    await migrate_legacy_statuses()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
