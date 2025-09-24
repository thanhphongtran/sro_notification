#!/usr/bin/env python3
"""
PagerDuty Notification Generator - Web UI
FastAPI application for generating PagerDuty incident notifications
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import uvicorn

from app.api import incidents
from app.config.config import settings

# Create FastAPI app
app = FastAPI(
    title="PagerDuty Notification Generator",
    description="""
    Web interface for generating PagerDuty incident notifications
    
    ## ⚠️ Important: Incident ID vs Incident Number
    
    **incident_id**: Long alphanumeric string (e.g., `P1234567890ABCDEF`) - Use this for most API endpoints
    **incident_number**: Short 7-digit number (e.g., `2668960`) - Use this for the main notification generation
    
    Most endpoints use `incident_id`, but the main notification generation uses `incident_number` (ticket_number).
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Include API routes
app.include_router(incidents.router, prefix="/api", tags=["incidents"])

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="app/templates")

@app.get("/", response_class=HTMLResponse)
async def root():
    """Main web interface"""
    return templates.TemplateResponse("index.html", {"request": {}})

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pagerduty-notification-generator"}

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
