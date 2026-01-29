from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from config import get_settings

class Database:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

db_instance = Database()

async def get_database() -> AsyncIOMotorDatabase:
    return db_instance.db

async def connect_to_mongo():
    settings = get_settings()
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URL)
    db_instance.db = db_instance.client[settings.DB_NAME]
    
    # Create indexes
    await db_instance.db.messages.create_index("created_at")
    await db_instance.db.messages.create_index("campaign_id")
    await db_instance.db.messages.create_index("status")
    await db_instance.db.contacts.create_index("phone_number", unique=True)
    await db_instance.db.campaigns.create_index("created_at")
    
async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()
