from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "Dragon Palace POS"
    database_url: str = "sqlite:///./pos.db"
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 720  # 12 hours
    tax_rate: float = 0.0825
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

