from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from twilio.rest import Client as TwilioClient

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

# Twilio WhatsApp config
TWILIO_SID = os.environ.get('TWILIO_ACCOUNT_SID')
TWILIO_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM')
twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN) if TWILIO_SID else None

# Mapping magasin ID → numéro WhatsApp du responsable
# TEMPORAIRE : tous les messages vont vers le numéro de test
STORE_WHATSAPP = {
    "lattes": "+33616331164",
    "montpellier-nord": "+33616331164",
    "montpellier-sud": "+33616331164",
    "nimes-costieres": "+33616331164",
    "nimes-etoile": "+33616331164",
    "beziers": "+33616331164",
    "boulogne": "+33616331164",
    "plaisir": "+33616331164",
    "les-ulis": "+33616331164",
}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Repair & Co API")
api_router = APIRouter(prefix="/api")


# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
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


# ==================== ADMIN SEED ====================

async def seed_admin():
    existing = await db.admin_users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.admin_users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.admin_users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logger.info(f"Admin password updated: {ADMIN_EMAIL}")


# ==================== EMAIL HELPER ====================

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


async def send_whatsapp(store_id: str, message: str):
    """Send WhatsApp notification to store manager. Non-blocking."""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        return
    to_number = STORE_WHATSAPP.get(store_id)
    if not to_number:
        return
    try:
        await asyncio.to_thread(
            lambda: twilio_client.messages.create(
                from_=TWILIO_WHATSAPP_FROM,
                to=f"whatsapp:{to_number}",
                body=message
            )
        )
        logger.info(f"WhatsApp sent to {store_id} ({to_number})")
    except Exception as e:
        logger.error(f"WhatsApp send failed ({store_id}): {e}")

def build_email_html(title: str, fields: dict) -> str:
    rows = ""
    for label, value in fields.items():
        if value:
            rows += f'<tr><td style="padding:8px 12px;font-weight:600;color:#1A5C3A;vertical-align:top;white-space:nowrap">{label}</td><td style="padding:8px 12px;color:#1A1A2E">{value}</td></tr>'
    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1A5C3A;padding:20px 24px;border-radius:12px 12px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Repair&Co — {title}</h1>
      </div>
      <div style="border:1px solid #E8F5EE;border-top:none;border-radius:0 0 12px 12px;padding:4px 0">
        <table style="width:100%;border-collapse:collapse">{rows}</table>
      </div>
      <p style="color:#999;font-size:12px;margin-top:16px;text-align:center">Email envoyé automatiquement depuis le site repairandco.fr</p>
    </div>"""


# ==================== FORM MODELS ====================

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
    doc = input.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["status"] = "pending"
    await db.demandes_devis.insert_one(doc)
    asyncio.ensure_future(send_notification(
        f"Nouvelle demande de devis — {doc['device_type']}",
        build_email_html("Nouvelle demande de devis", {
            "Type d'appareil": doc['device_type'], "Marque": doc['brand'], "Modèle": doc['model'],
            "Problèmes": ", ".join(doc['issue_types']), "Autre problème": doc.get('other_issue'),
            "Nom": doc['name'], "Téléphone": doc['phone'], "Email": doc['email'],
            "Magasin": doc['store'], "Créneau préféré": doc.get('preferred_time'),
        })
    ))
    asyncio.ensure_future(send_whatsapp(
        doc['store'],
        f"📱 Nouvelle demande de devis\n\n"
        f"Appareil : {doc['device_type']} {doc['brand']} {doc['model']}\n"
        f"Problème : {', '.join(doc['issue_types'])}\n"
        f"Client : {doc['name']}\n"
        f"Tél : {doc['phone']}\n"
        f"Créneau : {doc.get('preferred_time') or 'Non précisé'}"
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/contact")
async def create_contact(input: ContactRequestCreate):
    doc = input.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.demandes_contact.insert_one(doc)
    asyncio.ensure_future(send_notification(
        f"Nouveau message — {doc['subject']}",
        build_email_html("Nouveau message / RDV", {
            "Nom": doc['name'], "Email": doc['email'], "Téléphone": doc.get('phone'),
            "Objet": doc['subject'], "Magasin": doc.get('store'), "Message": doc['message'],
        })
    ))
    if doc.get('store'):
        asyncio.ensure_future(send_whatsapp(
            doc['store'],
            f"📋 Nouveau message / RDV\n\n"
            f"Objet : {doc['subject']}\n"
            f"Client : {doc['name']}\n"
            f"Tél : {doc.get('phone') or 'Non précisé'}\n"
            f"Message : {doc['message'][:100]}"
        ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/b2b")
async def create_b2b(input: B2BRequestCreate):
    doc = input.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.demandes_entreprise.insert_one(doc)
    asyncio.ensure_future(send_notification(
        f"Demande B2B — {doc['company']}",
        build_email_html("Demande Services Entreprise", {
            "Prénom": doc['first_name'], "Nom": doc['last_name'], "Société": doc['company'],
            "Email": doc['email'], "Téléphone": doc['phone'], "Taille de flotte": doc['fleet_size'],
            "Type de besoin": doc.get('need_type'), "Message": doc.get('message'),
        })
    ))
    return {"status": "success", "id": doc["id"]}

@api_router.post("/buyback")
async def create_buyback(input: BuybackRequestCreate):
    doc = input.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.demandes_rachat.insert_one(doc)
    conditions_map = {"bon": "Bon état", "moyen": "État moyen", "abime": "Abîmé"}
    asyncio.ensure_future(send_notification(
        f"Demande de rachat — {doc['brand']} {doc['model']}",
        build_email_html("Demande de rachat", {
            "Marque": doc['brand'], "Modèle": doc['model'],
            "État": conditions_map.get(doc['condition'], doc['condition']),
            "Nom": doc['name'], "Téléphone": doc['phone'], "Magasin": doc['store'],
        })
    ))
    asyncio.ensure_future(send_whatsapp(
        doc['store'],
        f"♻️ Demande de rachat\n\n"
        f"Appareil : {doc['brand']} {doc['model']}\n"
        f"État : {conditions_map.get(doc['condition'], doc['condition'])}\n"
        f"Client : {doc['name']}\n"
        f"Tél : {doc['phone']}"
    ))
    return {"status": "success", "id": doc["id"]}


# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/demandes-devis")
async def get_demandes_devis(user=Depends(get_current_admin)):
    docs = await db.demandes_devis.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/admin/demandes-contact")
async def get_demandes_contact(user=Depends(get_current_admin)):
    docs = await db.demandes_contact.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/admin/demandes-entreprise")
async def get_demandes_entreprise(user=Depends(get_current_admin)):
    docs = await db.demandes_entreprise.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/admin/demandes-rachat")
async def get_demandes_rachat(user=Depends(get_current_admin)):
    docs = await db.demandes_rachat.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/admin/stats")
async def get_admin_stats(user=Depends(get_current_admin)):
    devis = await db.demandes_devis.count_documents({})
    contact = await db.demandes_contact.count_documents({})
    entreprise = await db.demandes_entreprise.count_documents({})
    rachat = await db.demandes_rachat.count_documents({})
    return {"devis": devis, "contact": contact, "entreprise": entreprise, "rachat": rachat, "total": devis + contact + entreprise + rachat}


# ==================== APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    await seed_admin()
    await db.admin_users.create_index("email", unique=True)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
