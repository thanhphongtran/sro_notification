#!/usr/bin/env python3
"""
Startup script for PagerDuty Notification Generator Web UI
"""

import os
# Prevent __pycache__ generation during development - MUST be set before any other imports
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

import uvicorn
from app.config.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
