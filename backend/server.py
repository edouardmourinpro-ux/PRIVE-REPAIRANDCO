from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

# Create the main app
app = FastAPI(title="Repair & Co API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

# Quote Request (Devis)
class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    device_type: str  # smartphone, tablette, pc, electromenager
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

# Contact Form
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

# B2B Contact Form
class B2BRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    first_name: str
    last_name: str
    company: str
    email: EmailStr
    phone: str
    fleet_size: str
    message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class B2BRequestCreate(BaseModel):
    first_name: str
    last_name: str
    company: str
    email: EmailStr
    phone: str
    fleet_size: str
    message: Optional[str] = None

# Buyback Request (Rachat)
class BuybackRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    brand: str
    model: str
    condition: str  # bon, moyen, abime
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

# Store data
STORES = [
    {
        "id": "nimes-etoile",
        "name": "Nîmes Étoile",
        "address": "116 Rue André Dupont, Entrée 4",
        "city": "Nîmes",
        "postal_code": "30900",
        "location": "Carrefour Nîmes Étoile",
        "phone": "04 66 84 80 79",
        "hours": "Lundi–Samedi : 9h30–19h30",
        "rating": 4.7,
        "reviews_count": 225,
        "qualirepar": True,
        "maps_url": "https://www.google.com/maps/search/?api=1&query=116+Rue+André+Dupont+30900+Nîmes",
        "lat": 43.8367,
        "lng": 4.3601
    },
    {
        "id": "nimes-cap-costieres",
        "name": "Nîmes Cap Costières",
        "address": "Impasse de Rousellas, CC La Galerie",
        "city": "Nîmes",
        "postal_code": "30900",
        "location": "CC La Galerie",
        "phone": "04 48 19 14 09",
        "hours": "Lundi–Samedi : 9h30–20h00",
        "rating": 3.5,
        "reviews_count": None,
        "qualirepar": True,
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Impasse+de+Rousellas+30900+Nîmes",
        "lat": 43.8122,
        "lng": 4.3507
    },
    {
        "id": "montpellier-sud",
        "name": "Montpellier Sud",
        "address": "504 Avenue du Mas d'Argelliers, CC Intermarché",
        "city": "Montpellier",
        "postal_code": "34070",
        "location": "CC Intermarché",
        "phone": "04 67 58 81 39",
        "hours": "Lundi–Samedi : 9h30–20h00",
        "rating": 4.1,
        "reviews_count": 283,
        "qualirepar": True,
        "maps_url": "https://www.google.com/maps/search/?api=1&query=504+Avenue+du+Mas+d'Argelliers+34070+Montpellier",
        "lat": 43.5832,
        "lng": 3.8476
    },
    {
        "id": "perols-lattes",
        "name": "Pérols / Lattes",
        "address": "CC Grand Sud (Klepierre), Entrée 2",
        "city": "Lattes",
        "postal_code": "34970",
        "location": "CC Grand Sud",
        "phone": "06 61 66 03 30",
        "hours": "Lundi–Samedi : 9h30–20h00",
        "rating": None,
        "reviews_count": None,
        "qualirepar": True,
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Grand+Sud+Lattes",
        "lat": 43.5667,
        "lng": 3.9167
    },
    {
        "id": "beziers",
        "name": "Béziers",
        "address": "Centre Commercial",
        "city": "Béziers",
        "postal_code": "34500",
        "location": "Centre Commercial",
        "phone": "06 61 66 03 30",
        "hours": "Lundi–Samedi : 9h30–20h00",
        "rating": None,
        "reviews_count": None,
        "qualirepar": True,
        "maps_url": "https://www.google.com/maps/search/?api=1&query=Béziers+centre+commercial",
        "lat": 43.3442,
        "lng": 3.2150
    }
]

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Repair & Co API", "status": "online"}

# Stores
@api_router.get("/stores")
async def get_stores():
    return STORES

@api_router.get("/stores/{store_id}")
async def get_store(store_id: str):
    for store in STORES:
        if store["id"] == store_id:
            return store
    raise HTTPException(status_code=404, detail="Magasin non trouvé")

# Quote Request (Devis)
@api_router.post("/quote", response_model=QuoteRequest)
async def create_quote_request(input: QuoteRequestCreate):
    quote_dict = input.model_dump()
    quote_obj = QuoteRequest(**quote_dict)
    
    doc = quote_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.quotes.insert_one(doc)
    
    # TODO: Send email notification to edouardmourinpro@gmail.com
    logging.info(f"New quote request: {quote_obj.id} - {quote_obj.device_type} - {quote_obj.name}")
    
    return quote_obj

# Contact Form
@api_router.post("/contact", response_model=ContactRequest)
async def create_contact_request(input: ContactRequestCreate):
    contact_dict = input.model_dump()
    contact_obj = ContactRequest(**contact_dict)
    
    doc = contact_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contacts.insert_one(doc)
    
    # TODO: Send email notification
    logging.info(f"New contact request: {contact_obj.id} - {contact_obj.subject}")
    
    return contact_obj

# B2B Contact Form
@api_router.post("/b2b", response_model=B2BRequest)
async def create_b2b_request(input: B2BRequestCreate):
    b2b_dict = input.model_dump()
    b2b_obj = B2BRequest(**b2b_dict)
    
    doc = b2b_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.b2b_requests.insert_one(doc)
    
    # TODO: Send email notification
    logging.info(f"New B2B request: {b2b_obj.id} - {b2b_obj.company}")
    
    return b2b_obj

# Buyback Request (Rachat)
@api_router.post("/buyback", response_model=BuybackRequest)
async def create_buyback_request(input: BuybackRequestCreate):
    buyback_dict = input.model_dump()
    buyback_obj = BuybackRequest(**buyback_dict)
    
    doc = buyback_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.buybacks.insert_one(doc)
    
    # TODO: Send email notification
    logging.info(f"New buyback request: {buyback_obj.id} - {buyback_obj.brand} {buyback_obj.model}")
    
    return buyback_obj

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
