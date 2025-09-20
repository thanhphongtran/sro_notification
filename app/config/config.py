"""
Configuration settings for the PagerDuty Notification Generator
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    HOST: str = "127.0.0.1"
    PORT: int = 8080
    DEBUG: bool = True
    
    # PagerDuty API
    PAGER_DUTY_TOKEN: Optional[str] = None
    
    # Slack Integration
    SLACK_WEBHOOK_URL: Optional[str] = None
    
    # App Settings
    APP_NAME: str = "PagerDuty Notification Generator"
    APP_VERSION: str = "1.0.0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create settings instance
settings = Settings()
