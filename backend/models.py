from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class MessageStatus(str, Enum):
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"
    UNDELIVERED = "undelivered"

class MediaType(str, Enum):
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENT = "document"

class ProviderType(str, Enum):
    TWILIO = "twilio"
    BAILEYS = "baileys"

class MediaAttachment(BaseModel):
    media_type: MediaType
    media_url: str
    filename: str
    file_size: Optional[int] = None

class Contact(BaseModel):
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ContactCreate(BaseModel):
    phone_number: str
    name: Optional[str] = None
    email: Optional[str] = None
    tags: List[str] = []

class Message(BaseModel):
    recipient_phone: str
    message_body: str
    media_attachments: List[MediaAttachment] = []
    sender_number: str
    provider: ProviderType
    provider_message_id: Optional[str] = None
    status: MessageStatus = MessageStatus.QUEUED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_code: Optional[int] = None
    error_message: Optional[str] = None
    campaign_id: Optional[str] = None

class Campaign(BaseModel):
    name: str
    message_body: str
    media_attachments: List[MediaAttachment] = []
    recipients: List[str] = []
    provider: ProviderType = ProviderType.TWILIO
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    total_recipients: int = 0
    successful_sends: int = 0
    failed_sends: int = 0
    status: str = "draft"  # draft, scheduled, sending, completed, failed

class CampaignCreate(BaseModel):
    name: str
    message_body: str
    media_attachments: List[MediaAttachment] = []
    recipients: List[str] = []
    provider: ProviderType = ProviderType.TWILIO
    scheduled_at: Optional[datetime] = None

class BulkMessageRequest(BaseModel):
    recipients: List[str]
    message_body: str
    media_attachments: List[MediaAttachment] = []
    campaign_name: Optional[str] = None
    provider: ProviderType = ProviderType.TWILIO

class MessageStatusUpdate(BaseModel):
    MessageSid: str
    MessageStatus: str
    ErrorCode: Optional[int] = None
    ChannelStatusMessage: Optional[str] = None
    EventType: Optional[str] = None

class ProviderConfig(BaseModel):
    provider: ProviderType
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    whatsapp_number: Optional[str] = None
    is_active: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
