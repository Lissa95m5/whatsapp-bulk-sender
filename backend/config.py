from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    MONGO_URL: str = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    DB_NAME: str = os.environ.get('DB_NAME', 'whatsapp_sender')
    CORS_ORIGINS: str = os.environ.get('CORS_ORIGINS', '*')
    
    # Twilio settings
    TWILIO_ACCOUNT_SID: str = os.environ.get('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN: str = os.environ.get('TWILIO_AUTH_TOKEN', '')
    TWILIO_WHATSAPP_NUMBER: str = os.environ.get('TWILIO_WHATSAPP_NUMBER', '')
    
    # Rate limiting
    MAX_MESSAGES_PER_SECOND: int = int(os.environ.get('MAX_MESSAGES_PER_SECOND', '80'))
    
    # Upload settings
    UPLOAD_DIR: str = os.environ.get('UPLOAD_DIR', './uploads')
    MAX_UPLOAD_SIZE: int = int(os.environ.get('MAX_UPLOAD_SIZE', str(16 * 1024 * 1024)))  # 16MB
    
    class Config:
        env_file = '.env'

@lru_cache()
def get_settings():
    return Settings()
