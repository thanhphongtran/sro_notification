"""
Slack service for sending notifications to Slack channels
"""

import httpx
from typing import Dict
from fastapi import HTTPException

from app.config.config import settings


class SlackService:
    """Service for sending notifications to Slack via webhook"""
    
    def __init__(self):
        """Initialize the service with webhook URL"""
        self.webhook_url = settings.SLACK_WEBHOOK_URL
        if not self.webhook_url:
            raise ValueError("SLACK_WEBHOOK_URL environment variable not set")
    
    async def send_notification(self, message: str) -> Dict:
        """Send a notification message to Slack"""
        try:
            # Add @here mention for Slack notifications
            slack_message = f"{message}\n\n@here"
            
            # Use Block Kit format for proper @here mentions
            payload = {
                "text": slack_message,  # Fallback text for notifications
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": slack_message
                        }
                    }
                ]
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.webhook_url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Notification sent successfully"}
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Slack API error: {response.text}"
                    )
                    
        except httpx.TimeoutException:
            raise HTTPException(status_code=408, detail="Slack request timed out")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Slack request failed: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
    
    def send_notification_sync(self, message: str) -> Dict:
        """Send a notification message to Slack (synchronous version)"""
        try:
            # Add @here mention for Slack notifications
            slack_message = f"{message}\n\n@here"
            
            # Use Block Kit format for proper @here mentions
            payload = {
                "text": slack_message,  # Fallback text for notifications
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": slack_message
                        }
                    }
                ]
            }
            
            with httpx.Client() as client:
                response = client.post(
                    self.webhook_url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    return {"success": True, "message": "Notification sent successfully"}
                else:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Slack API error: {response.text}"
                    )
                    
        except httpx.TimeoutException:
            raise HTTPException(status_code=408, detail="Slack request timed out")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Slack request failed: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
