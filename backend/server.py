from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(title="Repair & Co API")
api_router = APIRouter(prefix="/api")


# ==================== EMAIL HELPER ====================

def _send_smtp_email(subject: str, html_body: str):
    """Send email via SMTP SSL (o2switch port 465). Runs in thread."""
    msg = MIMEMultipart("alternative")
    msg["From"] = SMTP_USER
    msg["To"] = NOTIFY_EMAIL
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, NOTIFY_EMAIL, msg.as_string())


async def send_notification(subject: str, html_body: str):
    """Non-blocking email send. Logs errors but never fails the request."""
    try:
        await asyncio.to_thread(_send_smtp_email, subject, html_body)
        logger.info(f"Email sent: {subject}")
    except Exception as e:
        logger.error(f"Email send failed: {e}")


def build_email_html(title: str, fields: dict) -> str:
    """Build a clean HTML email from field dict."""
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
      <p style="color:#999;font-size:12px;margin-top:16px;text-align:center">
        Email envoyé automatiquement depuis le site repairandco.fr
      </p>
    </div>"""


# ==================== MODELS ====================

class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"

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

class ContactRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    store: Optional[str] = None
    message: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactRequestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    store: Optional[str] = None
    message: str

class B2BRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    company: str
    email: EmailStr
    phone: str
    fleet_size: str
    need_type: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class B2BRequestCreate(BaseModel):
    first_name: str
    last_name: str
    company: str
    email: EmailStr
    phone: str
    fleet_size: str
    need_type: Optional[str] = None
    message: Optional[str] = None

class BuybackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand: str
    model: str
    condition: str
    name: str
    phone: str
    store: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BuybackRequestCreate(BaseModel):
    brand: str
    model: str
    condition: str
    name: str
    phone: str
    store: str


# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Repair & Co API", "status": "online"}


# --- Devis (Quote) ---
@api_router.post("/quote", response_model=QuoteRequest)
async def create_quote_request(input: QuoteRequestCreate):
    quote_obj = QuoteRequest(**input.model_dump())
    doc = quote_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.demandes_devis.insert_one(doc)

    asyncio.ensure_future(send_notification(
        f"Nouvelle demande de devis — {quote_obj.device_type}",
        build_email_html("Nouvelle demande de devis", {
            "Type d'appareil": quote_obj.device_type,
            "Marque": quote_obj.brand,
            "Modèle": quote_obj.model,
            "Problèmes": ", ".join(quote_obj.issue_types),
            "Autre problème": quote_obj.other_issue,
            "Nom": quote_obj.name,
            "Téléphone": quote_obj.phone,
            "Email": quote_obj.email,
            "Magasin": quote_obj.store,
            "Créneau préféré": quote_obj.preferred_time,
        })
    ))
    return quote_obj


# --- Contact / RDV ---
@api_router.post("/contact", response_model=ContactRequest)
async def create_contact_request(input: ContactRequestCreate):
    contact_obj = ContactRequest(**input.model_dump())
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.demandes_contact.insert_one(doc)

    asyncio.ensure_future(send_notification(
        f"Nouveau message — {contact_obj.subject}",
        build_email_html("Nouveau message / RDV", {
            "Nom": contact_obj.name,
            "Email": contact_obj.email,
            "Téléphone": contact_obj.phone,
            "Objet": contact_obj.subject,
            "Magasin": contact_obj.store,
            "Message": contact_obj.message,
        })
    ))
    return contact_obj


# --- B2B (Services Entreprise) ---
@api_router.post("/b2b", response_model=B2BRequest)
async def create_b2b_request(input: B2BRequestCreate):
    b2b_obj = B2BRequest(**input.model_dump())
    doc = b2b_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.demandes_entreprise.insert_one(doc)

    asyncio.ensure_future(send_notification(
        f"Demande B2B — {b2b_obj.company}",
        build_email_html("Demande Services Entreprise", {
            "Prénom": b2b_obj.first_name,
            "Nom": b2b_obj.last_name,
            "Société": b2b_obj.company,
            "Email": b2b_obj.email,
            "Téléphone": b2b_obj.phone,
            "Taille de flotte": b2b_obj.fleet_size,
            "Type de besoin": b2b_obj.need_type,
            "Message": b2b_obj.message,
        })
    ))
    return b2b_obj


# --- Rachat / Buyback ---
@api_router.post("/buyback", response_model=BuybackRequest)
async def create_buyback_request(input: BuybackRequestCreate):
    buyback_obj = BuybackRequest(**input.model_dump())
    doc = buyback_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.demandes_rachat.insert_one(doc)

    conditions_map = {"bon": "Bon état", "moyen": "État moyen", "abime": "Abîmé"}
    asyncio.ensure_future(send_notification(
        f"Demande de rachat — {buyback_obj.brand} {buyback_obj.model}",
        build_email_html("Demande de rachat", {
            "Marque": buyback_obj.brand,
            "Modèle": buyback_obj.model,
            "État": conditions_map.get(buyback_obj.condition, buyback_obj.condition),
            "Nom": buyback_obj.name,
            "Téléphone": buyback_obj.phone,
            "Magasin": buyback_obj.store,
        })
    ))
    return buyback_obj


# ==================== APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
