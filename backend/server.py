from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
import logging
from pathlib import Path
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import mimetypes
import asyncio
from contextlib import asynccontextmanager
from twilio.rest import Client

from models import (
    Contact, ContactCreate, Message, Campaign, CampaignCreate,
    BulkMessageRequest, MessageStatus, MediaType, ProviderType,
    MessageStatusUpdate, MediaAttachment, ProviderConfig
)
from config import get_settings
from database import connect_to_mongo, close_mongo_connection, get_database

ROOT_DIR = Path(__file__).parent
settings = get_settings()

# Create upload directory
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

# Twilio client (will be initialized if credentials are provided)
twilio_client: Optional[Client] = None

# Rate limiter
class MessageRateLimiter:
    def __init__(self, max_messages_per_second: int = 80):
        self.max_messages_per_second = max_messages_per_second
        self.message_times = {}
        self.lock = asyncio.Lock()
    
    async def check_rate_limit(self, phone_number: str) -> bool:
        async with self.lock:
            now = datetime.now()
            
            if phone_number not in self.message_times:
                self.message_times[phone_number] = []
            
            self.message_times[phone_number] = [
                msg_time for msg_time in self.message_times[phone_number]
                if (now - msg_time).total_seconds() < 1
            ]
            
            if len(self.message_times[phone_number]) >= self.max_messages_per_second:
                return False
            
            self.message_times[phone_number].append(now)
            return True

rate_limiter = MessageRateLimiter(settings.MAX_MESSAGES_PER_SECOND)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    
    # Initialize Twilio if credentials are present
    global twilio_client
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        twilio_client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        logger.info("Twilio client initialized")
    else:
        logger.warning("Twilio credentials not found. Please configure in settings.")
    
    logger.info("Application started")
    yield
    
    # Shutdown
    await close_mongo_connection()
    logger.info("Application shutdown")

# Create the main app
app = FastAPI(title="WhatsApp Bulk Sender", version="1.0.0", lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Media type limits
MEDIA_TYPE_LIMITS = {
    MediaType.IMAGE: {"max_size": 5 * 1024 * 1024, "allowed_types": ["image/jpeg", "image/png", "image/jpg"]},
    MediaType.AUDIO: {"max_size": 16 * 1024 * 1024, "allowed_types": ["audio/ogg", "audio/mpeg", "audio/mp3"]},
    MediaType.VIDEO: {"max_size": 16 * 1024 * 1024, "allowed_types": ["video/mp4"]},
    MediaType.DOCUMENT: {"max_size": 16 * 1024 * 1024, "allowed_types": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]}
}

# Helper function to send WhatsApp message via Twilio
async def send_twilio_message(
    to_number: str,
    message_body: str,
    media_urls: List[str] = None
) -> dict:
    if not twilio_client:
        raise HTTPException(status_code=400, detail="Twilio not configured. Please add credentials in settings.")
    
    if not await rate_limiter.check_rate_limit(settings.TWILIO_WHATSAPP_NUMBER):
        await asyncio.sleep(0.5)  # Back off if rate limited
    
    try:
        message_params = {
            "from_": settings.TWILIO_WHATSAPP_NUMBER,
            "to": f"whatsapp:{to_number}",
            "body": message_body,
        }
        
        if media_urls:
            message_params["media_url"] = media_urls
        
        twilio_message = twilio_client.messages.create(**message_params)
        
        return {
            "success": True,
            "message_id": twilio_message.sid,
            "status": twilio_message.status
        }
    except Exception as e:
        logger.error(f"Error sending Twilio message: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# Routes
@api_router.get("/")
async def root():
    return {"message": "WhatsApp Bulk Sender API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "twilio_configured": twilio_client is not None
    }

# Contact Management
@api_router.post("/contacts")
async def create_contact(
    contact: ContactCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    existing = await db.contacts.find_one({"phone_number": contact.phone_number})
    if existing:
        raise HTTPException(status_code=400, detail="Contact already exists")
    
    contact_dict = contact.model_dump()
    contact_dict["created_at"] = datetime.utcnow().isoformat()
    
    result = await db.contacts.insert_one(contact_dict)
    contact_dict["id"] = str(result.inserted_id)
    
    return {"success": True, "contact": contact_dict}

@api_router.get("/contacts")
async def get_contacts(
    limit: int = 100,
    skip: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    contacts = await db.contacts.find({}, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    total = await db.contacts.count_documents({})
    
    return {
        "contacts": contacts,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.post("/contacts/bulk")
async def upload_contacts_csv(
    contacts: List[ContactCreate],
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    added = 0
    skipped = 0
    
    for contact in contacts:
        existing = await db.contacts.find_one({"phone_number": contact.phone_number})
        if existing:
            skipped += 1
            continue
        
        contact_dict = contact.model_dump()
        contact_dict["created_at"] = datetime.utcnow().isoformat()
        await db.contacts.insert_one(contact_dict)
        added += 1
    
    return {
        "success": True,
        "added": added,
        "skipped": skipped,
        "total": len(contacts)
    }

@api_router.delete("/contacts/{phone_number}")
async def delete_contact(
    phone_number: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    result = await db.contacts.delete_one({"phone_number": phone_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    return {"success": True, "message": "Contact deleted"}

# Media Upload
@api_router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    media_type: str = Form(...)
):
    try:
        media_type_enum = MediaType(media_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid media type. Allowed: {[t.value for t in MediaType]}")
    
    contents = await file.read()
    file_size = len(contents)
    
    limits = MEDIA_TYPE_LIMITS[media_type_enum]
    if file_size > limits["max_size"]:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size for {media_type}: {limits['max_size'] / 1024 / 1024}MB"
        )
    
    if file.content_type not in limits["allowed_types"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {limits['allowed_types']}"
        )
    
    file_ext = Path(file.filename).suffix
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    with open(file_path, "wb") as f:
        f.write(contents)
    
    media_url = f"/api/media/{unique_filename}"
    
    return {
        "success": True,
        "filename": file.filename,
        "media_url": media_url,
        "media_type": media_type,
        "file_size": file_size
    }

@api_router.get("/media/{filename}")
async def get_media(filename: str):
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    mime_type, _ = mimetypes.guess_type(str(file_path))
    
    return Response(
        content=open(file_path, "rb").read(),
        media_type=mime_type or "application/octet-stream"
    )

# Campaign Management
@api_router.post("/campaigns")
async def create_campaign(
    campaign: CampaignCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    campaign_dict = campaign.model_dump()
    campaign_dict["created_at"] = datetime.utcnow().isoformat()
    campaign_dict["total_recipients"] = len(campaign.recipients)
    campaign_dict["successful_sends"] = 0
    campaign_dict["failed_sends"] = 0
    campaign_dict["status"] = "scheduled" if campaign.scheduled_at else "draft"
    
    if campaign.scheduled_at:
        campaign_dict["scheduled_at"] = campaign.scheduled_at.isoformat()
    
    result = await db.campaigns.insert_one(campaign_dict)
    campaign_dict["id"] = str(result.inserted_id)
    
    return {"success": True, "campaign": campaign_dict}

@api_router.get("/campaigns")
async def get_campaigns(
    limit: int = 20,
    skip: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    campaigns = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    total = await db.campaigns.count_documents({})
    
    return {
        "campaigns": campaigns,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(
    campaign_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return campaign

@api_router.get("/campaigns/{campaign_id}/status")
async def get_campaign_status(
    campaign_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        }
    ]
    
    results = await db.messages.aggregate(pipeline).to_list(None)
    status_counts = {result["_id"]: result["count"] for result in results}
    
    total_messages = sum(status_counts.values())
    delivered_count = status_counts.get("delivered", 0) + status_counts.get("read", 0)
    
    return {
        "campaign_id": campaign_id,
        "total_messages": total_messages,
        "status_breakdown": status_counts,
        "delivery_rate": (delivered_count / total_messages * 100) if total_messages > 0 else 0
    }

# Message Sending
@api_router.post("/messages/send")
async def send_single_message(
    recipient_phone: str = Form(...),
    message_body: str = Form(...),
    media_urls: Optional[str] = Form(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    media_url_list = media_urls.split(",") if media_urls else []
    
    result = await send_twilio_message(recipient_phone, message_body, media_url_list)
    
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send message"))
    
    message_dict = {
        "recipient_phone": recipient_phone,
        "message_body": message_body,
        "media_attachments": [{"media_url": url, "media_type": "unknown"} for url in media_url_list],
        "sender_number": settings.TWILIO_WHATSAPP_NUMBER,
        "provider": ProviderType.TWILIO.value,
        "provider_message_id": result["message_id"],
        "status": MessageStatus.SENT.value,
        "created_at": datetime.utcnow().isoformat(),
        "sent_at": datetime.utcnow().isoformat()
    }
    
    await db.messages.insert_one(message_dict)
    
    return {
        "success": True,
        "message_id": result["message_id"],
        "status": "sent"
    }

@api_router.post("/messages/bulk")
async def send_bulk_messages(
    bulk_request: BulkMessageRequest,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    campaign_id = str(uuid.uuid4())
    
    campaign_dict = {
        "id": campaign_id,
        "name": bulk_request.campaign_name or f"Campaign {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        "message_body": bulk_request.message_body,
        "media_attachments": [att.model_dump() for att in bulk_request.media_attachments],
        "recipients": bulk_request.recipients,
        "provider": bulk_request.provider.value,
        "created_at": datetime.utcnow().isoformat(),
        "sent_at": datetime.utcnow().isoformat(),
        "total_recipients": len(bulk_request.recipients),
        "successful_sends": 0,
        "failed_sends": 0,
        "status": "sending"
    }
    
    await db.campaigns.insert_one(campaign_dict)
    
    successful_sends = 0
    failed_sends = 0
    media_urls = [att.media_url for att in bulk_request.media_attachments]
    
    for recipient in bulk_request.recipients:
        try:
            result = await send_twilio_message(recipient, bulk_request.message_body, media_urls)
            
            message_dict = {
                "recipient_phone": recipient,
                "message_body": bulk_request.message_body,
                "media_attachments": [att.model_dump() for att in bulk_request.media_attachments],
                "sender_number": settings.TWILIO_WHATSAPP_NUMBER,
                "provider": bulk_request.provider.value,
                "provider_message_id": result.get("message_id"),
                "status": MessageStatus.SENT.value if result["success"] else MessageStatus.FAILED.value,
                "created_at": datetime.utcnow().isoformat(),
                "sent_at": datetime.utcnow().isoformat() if result["success"] else None,
                "campaign_id": campaign_id,
                "error_message": result.get("error") if not result["success"] else None
            }
            
            await db.messages.insert_one(message_dict)
            
            if result["success"]:
                successful_sends += 1
            else:
                failed_sends += 1
                
        except Exception as e:
            logger.error(f"Failed to send to {recipient}: {str(e)}")
            failed_sends += 1
    
    await db.campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "successful_sends": successful_sends,
                "failed_sends": failed_sends,
                "status": "completed",
                "completed_at": datetime.utcnow().isoformat()
            }
        }
    )
    
    return {
        "success": True,
        "campaign_id": campaign_id,
        "total_recipients": len(bulk_request.recipients),
        "successful": successful_sends,
        "failed": failed_sends
    }

# Provider Configuration
@api_router.post("/settings/provider")
async def configure_provider(
    config: ProviderConfig,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    config_dict = config.model_dump()
    config_dict["created_at"] = datetime.utcnow().isoformat()
    
    await db.provider_configs.update_one(
        {"provider": config.provider.value},
        {"$set": config_dict},
        upsert=True
    )
    
    # Update Twilio client if Twilio config
    global twilio_client
    if config.provider == ProviderType.TWILIO and config.is_active:
        if config.account_sid and config.auth_token:
            twilio_client = Client(config.account_sid, config.auth_token)
            logger.info("Twilio client updated")
    
    return {"success": True, "message": "Provider configured successfully"}

@api_router.get("/settings/providers")
async def get_providers(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    configs = await db.provider_configs.find({}, {"_id": 0}).to_list(length=10)
    return {"providers": configs}

# Analytics & Stats
@api_router.get("/stats/dashboard")
async def get_dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    total_contacts = await db.contacts.count_documents({})
    total_campaigns = await db.campaigns.count_documents({})
    total_messages = await db.messages.count_documents({})
    
    delivered_count = await db.messages.count_documents({"status": MessageStatus.DELIVERED.value})
    failed_count = await db.messages.count_documents({"status": MessageStatus.FAILED.value})
    
    recent_campaigns = await db.campaigns.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(length=5)
    
    return {
        "total_contacts": total_contacts,
        "total_campaigns": total_campaigns,
        "total_messages": total_messages,
        "delivered_messages": delivered_count,
        "failed_messages": failed_count,
        "delivery_rate": (delivered_count / total_messages * 100) if total_messages > 0 else 0,
        "recent_campaigns": recent_campaigns
    }

# Webhook for Twilio status updates
@api_router.post("/webhook/status")
async def twilio_status_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    try:
        body = await request.form()
        
        message_sid = body.get("MessageSid")
        message_status = body.get("MessageStatus")
        error_code = body.get("ErrorCode")
        
        update_fields = {
            "status": message_status,
        }
        
        if message_status == "delivered":
            update_fields["delivered_at"] = datetime.utcnow().isoformat()
        elif message_status == "read":
            update_fields["read_at"] = datetime.utcnow().isoformat()
        elif message_status in ["failed", "undelivered"]:
            update_fields["error_code"] = error_code
        
        await db.messages.update_one(
            {"provider_message_id": message_sid},
            {"$set": update_fields}
        )
        
        logger.info(f"Updated message {message_sid} status to {message_status}")
        
        return {"status": "ok"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        return {"status": "error", "detail": str(e)}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
