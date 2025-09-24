"""
PagerDuty service for FastAPI application
Uses the shared PagerDutyCore module for business logic
"""

import os
from typing import Dict, List
from fastapi import HTTPException

from .pagerduty_client import PagerDutyClient
from app.config.config import settings


class PagerDutyService:
    """FastAPI service wrapper around PagerDutyClient"""
    
    def __init__(self):
        """Initialize the service with API credentials"""
        self.token = settings.PAGER_DUTY_TOKEN or os.getenv("PAGER_DUTY_TOKEN")
        if not self.token:
            raise ValueError("PAGER_DUTY_TOKEN environment variable not set")
        
        # Initialize the PagerDuty client
        self.core = PagerDutyClient(token=self.token)
    
    def get_incident_data(self, ticket_number: str) -> Dict:
        """Get incident data including conference bridge and Slack channel information"""
        try:
            return self.core.get_incident_data(ticket_number)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def generate_notification_message(
        self, 
        incident_data: Dict, 
        ticket_number: str, 
        update_number: int = 1, 
        resolve: bool = False, 
        downgrade: bool = False
    ) -> str:
        """Generate notification message for incident"""
        try:
            return self.core.generate_notification_message(
                incident_data, ticket_number, update_number, resolve, downgrade
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def get_responders_data(self, incident_data: Dict) -> List[Dict]:
        """Get responders data in a structured format"""
        try:
            return self.core.get_responders_data(incident_data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def add_note(self, incident_id: str, message: str) -> Dict:
        """Add a note to a PagerDuty incident"""
        try:
            return self.core.add_note(incident_id, message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def send_status_update(self, incident_id: str, status: str, message: str) -> Dict:
        """Send a status update to a PagerDuty incident"""
        try:
            return self.core.send_status_update(incident_id, status, message)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def get_status_updates(self, incident_id: str) -> List[Dict]:
        """Get status updates for a PagerDuty incident"""
        try:
            return self.core.get_status_updates(incident_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def get_incident_notes(self, incident_id: str) -> List[Dict]:
        """Get notes for a PagerDuty incident"""
        try:
            return self.core.get_incident_notes(incident_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def get_custom_field_values(self, incident_id: str) -> Dict:
        """Get custom field values for a PagerDuty incident"""
        try:
            return self.core.get_custom_field_values(incident_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def get_custom_field_value(self, incident_id: str, custom_field_id: str) -> Dict:
        """Get a specific custom field value for a PagerDuty incident"""
        try:
            return self.core.get_custom_field_value(incident_id, custom_field_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))