"""
Pydantic models for incident-related data
"""

from typing import List, Optional
from pydantic import BaseModel


class IncidentRequest(BaseModel):
    """Request model for generating incident notifications"""
    ticket_number: str
    update_number: int = 1
    resolve: bool = False
    downgrade: bool = False
    show_users: bool = False


class TeamInfo(BaseModel):
    """Team information model"""
    team_name: str
    users: List[str]
    color: str


class UserInfo(BaseModel):
    """User information model"""
    user_name: str
    teams: List[str]
    color: str


class IncidentResponse(BaseModel):
    """Response model for incident notifications"""
    notification_message: str
    incident_data: dict
    responders: Optional[List[dict]] = None


class IncidentData(BaseModel):
    """Incident data model"""
    ticket_number: str
    title: str
    incident_number: str
    priority: str
    escalation_policy: str
    created_at: str
    status: str
