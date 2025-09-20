"""
API routes for incident-related operations
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.models.incident import IncidentRequest, IncidentResponse
from app.services.pagerduty_service import PagerDutyService
from app.services.slack_service import SlackService
from app.config.notification_template import get_template

router = APIRouter()

def get_pagerduty_service() -> PagerDutyService:
    """Dependency to get PagerDuty service instance"""
    return PagerDutyService()

def get_slack_service() -> SlackService:
    """Dependency to get Slack service instance"""
    return SlackService()

class SlackMessageRequest(BaseModel):
    """Request model for Slack message"""
    message: str

class StatusUpdateRequest(BaseModel):
    """Request model for PagerDuty status update"""
    incident_id: str = Field(..., description="The PagerDuty incident ID")
    status: str = Field(..., description="The status update type (investigating, identified, monitoring, resolved)")
    message: str = Field(..., description="The status update message")

class AddNoteRequest(BaseModel):
    """Request model for PagerDuty add note"""
    incident_id: str = Field(..., description="The PagerDuty incident ID")
    message: str = Field(..., description="The note message")


@router.post("/generate", response_model=IncidentResponse)
async def generate_notification(
    request: IncidentRequest,
    service: PagerDutyService = Depends(get_pagerduty_service)
):
    """Generate a notification message for an incident"""
    try:
        incident_data = service.get_incident_data(request.ticket_number)
        notification_message = service.generate_notification_message(
            incident_data, 
            request.ticket_number, 
            request.update_number, 
            request.resolve, 
            request.downgrade
        )
        
        responders = None
        if request.show_users:
            responders = service.get_responders_data(incident_data)
        
        return IncidentResponse(
            notification_message=notification_message,
            incident_data=incident_data,
            responders=responders
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/incident/{ticket_number}")
async def get_incident(
    ticket_number: str,
    service: PagerDutyService = Depends(get_pagerduty_service)
):
    """Get incident data by ticket number"""
    try:
        incident_data = service.get_incident_data(ticket_number)
        return incident_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/incident/{ticket_number}/responders")
async def get_incident_responders(
    ticket_number: str,
    service: PagerDutyService = Depends(get_pagerduty_service)
):
    """Get incident responders by ticket number"""
    try:
        incident_data = service.get_incident_data(ticket_number)
        responders = service.get_responders_data(incident_data)
        return {"responders": responders}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/slack/send")
async def send_slack_notification(
    request: SlackMessageRequest,
    slack_service: SlackService = Depends(get_slack_service)
):
    """Send a notification message to Slack"""
    try:
        result = await slack_service.send_notification(request.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/template")
async def get_notification_template():
    """Get the current notification template configuration"""
    try:
        template = get_template()
        return {
            "header_template": template.header_template,
            "update_template": template.update_template,
            "bullet_templates": template.bullet_templates,
            "footer_template": template.footer_template,
            "status_prefixes": template.status_prefixes
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/status-update")
async def send_status_update(
    request: StatusUpdateRequest,
    service: PagerDutyService = Depends(get_pagerduty_service)
):
    """Send a status update to a PagerDuty incident"""
    try:
        result = service.send_status_update(
            request.incident_id,
            request.status,
            request.message
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-note")
async def add_note(
    request: AddNoteRequest,
    service: PagerDutyService = Depends(get_pagerduty_service)
):
    """Add a note to a PagerDuty incident"""
    try:
        result = service.add_note(
            request.incident_id,
            request.message
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

