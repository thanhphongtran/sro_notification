"""
PagerDuty API client
Pure Python module with no external framework dependencies
"""

import os
import requests
from datetime import datetime, timezone
from typing import Dict, List, Optional
import pytz
from app.config.notification_template import get_bullet_template, get_status_prefix, format_header, format_update_line, format_footer


class PagerDutyClient:
    """
    PagerDuty API client with pure Python business logic.
    No external framework dependencies - can be used by CLI, FastAPI, or any other application.
    """
    
    def __init__(self, token: Optional[str] = None):
        """
        Initialize the PagerDuty API client.
        
        Args:
            token: PagerDuty API token. If None, will try to get from PAGER_DUTY_TOKEN env var.
        """
        self.token = token or os.getenv("PAGER_DUTY_TOKEN")
        if not self.token:
            raise ValueError("PAGER_DUTY_TOKEN must be provided or set as environment variable")
        
        self.headers = {
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
            'Authorization': f'Token token={self.token}'
        }
    
    def get_incident_data(self, ticket_number: str) -> Dict:
        """
        Get incident data including conference bridge and Slack channel information.
        
        Args:
            ticket_number: PagerDuty incident/ticket number
            
        Returns:
            Dict containing incident data with communication channel information
            
        Raises:
            Exception: If API request fails
        """
        # Include conference bridge in the incident data
        url = f"https://api.pagerduty.com/incidents/{ticket_number}?include[]=conference_bridge"
        response = requests.get(url, headers=self.headers)
        
        if response.status_code != 200:
            raise Exception(f"Failed to fetch incident {ticket_number}: {response.status_code} - {response.text}")
        
        incident_data = response.json()
        
        # Get Slack channel information from log entries using incident ID
        incident_id = incident_data['incident']['id']
        slack_channel_info = self.get_slack_channel_from_log_entries(incident_id)
        
        # Add Slack channel info to incident data
        if slack_channel_info:
            incident_data['slack_channel'] = slack_channel_info
        
        return incident_data
    
    def get_slack_channel_from_log_entries(self, incident_id: str) -> Optional[Dict]:
        """
        Get Slack channel information from incident log entries.
        
        Args:
            incident_id: PagerDuty incident ID (not ticket number)
            
        Returns:
            Dict containing Slack channel information or None if not found
        """
        try:
            more = True
            offset = ""
            
            while more:
                url = f"https://api.pagerduty.com/incidents/{incident_id}/log_entries?{offset}"
                response = requests.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    return None
                
                data = response.json()
                more = data.get('more', False)
                if more:
                    offset = f"offset={data['offset'] + data['limit']}"
                
                # Look for chat channel integration events
                for entry in data.get('log_entries', []):
                    if entry.get('type') == 'integration_chat_channel_event_log_entry':
                        return {
                            "chat_channel_name": entry.get('chat_channel_name'),
                            "chat_channel_web_link": entry.get('chat_channel_web_link')
                        }
            
            return None
            
        except Exception as e:
            print(f"Error fetching Slack channel info: {e}")
            return None
    
    def get_status_updates(self, incident_id: str) -> List[Dict]:
        """
        Get status updates for a PagerDuty incident.
        
        Args:
            incident_id: PagerDuty incident ID (not ticket number)
            
        Returns:
            List of status update log entries, ordered by creation time (oldest first)
        """
        try:
            more = True
            offset = ""
            status_updates = []
            
            while more:
                url = f"https://api.pagerduty.com/incidents/{incident_id}/log_entries?{offset}"
                response = requests.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    break
                
                data = response.json()
                more = data.get('more', False)
                if more:
                    offset = f"offset={data['offset'] + data['limit']}"
                
                # Look for status update entries
                for entry in data.get('log_entries', []):
                    if entry.get('type') in ['status_update_log_entry', 'incident_status_update_log_entry']:
                        status_updates.append(entry)
            
            # Sort by creation time (oldest first)
            status_updates.sort(key=lambda x: x.get('created_at', ''))
            
            return status_updates
            
        except Exception as e:
            print(f"Error fetching status updates: {e}")
            return []
    
    def get_incident_notes(self, incident_id: str) -> List[Dict]:
        """
        Get notes for a PagerDuty incident.
        
        Args:
            incident_id: PagerDuty incident ID (not ticket number)
            
        Returns:
            List of note entries, ordered by creation time (oldest first)
        """
        try:
            more = True
            offset = ""
            notes = []
            
            while more:
                url = f"https://api.pagerduty.com/incidents/{incident_id}/notes?{offset}"
                response = requests.get(url, headers=self.headers)
                
                if response.status_code != 200:
                    print(f"Error fetching notes: {response.status_code} - {response.text}")
                    break
                
                data = response.json()
                more = data.get('more', False)
                if more:
                    offset = f"offset={data['offset'] + data['limit']}"
                
                # Get note entries directly from the notes endpoint
                for note in data.get('notes', []):
                    notes.append(note)
            
            # Sort by creation time (oldest first)
            notes.sort(key=lambda x: x.get('created_at', ''))
            
            return notes
            
        except Exception as e:
            print(f"Error fetching incident notes: {e}")
            return []
    
    def convert_utc_to_eastern(self, utc_date_string: str) -> str:
        """
        Convert UTC date string to Eastern time format.
        
        Args:
            utc_date_string: UTC date in format "2025-09-12T19:28:02Z"
        
        Returns:
            Formatted date like "12-September-2025 | 3:28 PM EDT"
        """
        try:
            # Parse the UTC date
            utc_dt = datetime.fromisoformat(utc_date_string.replace('Z', '+00:00'))
            
            # Convert to Eastern time
            eastern_tz = pytz.timezone('US/Eastern')
            eastern_dt = utc_dt.astimezone(eastern_tz)
            
            # Format the date
            day = eastern_dt.day
            month = eastern_dt.strftime('%B')  # Full month name
            year = eastern_dt.year
            
            # Format time with AM/PM (remove zero padding from hour)
            hour = eastern_dt.hour % 12 or 12  # Convert 0 to 12, 13 to 1, etc.
            minute = eastern_dt.minute
            am_pm = eastern_dt.strftime('%p')
            time_str = f"{hour}:{minute:02d} {am_pm}"
            
            # Get timezone abbreviation (EST/EDT)
            tz_abbr = eastern_dt.strftime('%Z')
            
            return f"{day}-{month}-{year} | {time_str} {tz_abbr}"
        
        except Exception as e:
            return f"Error converting date: {e}"
    
    def generate_notification_message(
        self, 
        incident_data: Dict, 
        ticket_number: str, 
        update_number: int = 1, 
        resolve: bool = False, 
        downgrade: bool = False
    ) -> str:
        """
        Generate notification message for incident.
        
        Args:
            incident_data: Incident data from PagerDuty API
            ticket_number: The incident ticket number
            update_number: The update number (defaults to 1)
            resolve: Whether to add "Resolved |" prefix to update line
            downgrade: Whether to add "Downgraded |" prefix to update line
            
        Returns:
            Formatted notification message string
        """
        try:
            # Extract incident details
            title = incident_data['incident']['title']
            incident_number = incident_data['incident']['incident_number']
            priority = incident_data['incident']['priority']['name']
            escalation_policy = incident_data['incident']['escalation_policy']['summary']
            severity = priority[-1]
            
            # Determine which date to use
            if update_number == 1:
                # Use incident creation date for update 1
                created_at = self.convert_utc_to_eastern(incident_data['incident']['created_at'])
            else:
                # Use current date for subsequent updates
                current_utc = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
                created_at = self.convert_utc_to_eastern(current_utc)
            
            # Clean up escalation policy name
            trimmed_policy = escalation_policy.split(' - ')[0] if ' - ' in escalation_policy else escalation_policy
            
            # Clean up title for the SRO message
            alert_title = title
            
            # Check if title contains parentheses - if so, determine if it's part of the alert content
            if '(' in title:
                # Split on pipes to check if parentheses are in the actual alert or just prefixes
                parts = [part.strip() for part in title.split('|')]
                
                # If we have multiple parts, check if the first part(s) look like brand/region prefixes
                if len(parts) >= 2:
                    # Check if first part(s) are likely brand/region prefixes (short, no special chars)
                    first_part = parts[0]
                    second_part = parts[1] if len(parts) > 1 else ""
                    
                    # If first two parts are short and don't contain parentheses or special chars,
                    # they're likely brand/region prefixes to remove
                    if (len(first_part) <= 20 and len(second_part) <= 20 and 
                        not any(char in first_part + second_part for char in '()[]{}')):
                        # Take everything from the third part onwards, or second part if only 2 parts
                        if len(parts) >= 3:
                            alert_title = ' | '.join(parts[2:])
                        else:
                            alert_title = parts[1]
                    else:
                        # The parentheses are part of the actual alert content, keep the whole title
                        alert_title = title
                else:
                    # Only 1 part - parentheses are part of the alert, keep the whole title
                    alert_title = title
            else:
                # No parentheses found - look for patterns like "Brand | Region |" or "Brand |" at the start
                parts = [part.strip() for part in title.split('|')]
                
                if len(parts) >= 2:
                    # Check if we have 2+ parts and the first two look like brand/region
                    # (simple heuristic: short, no special chars, likely brand names)
                    first_part = parts[0]
                    second_part = parts[1]
                    
                    # If first two parts are short and don't contain parentheses or special chars,
                    # they're likely brand/region prefixes to remove
                    if (len(first_part) <= 20 and len(second_part) <= 20 and 
                        not any(char in first_part + second_part for char in '()[]{}')):
                        # Take everything from the third part onwards, or second part if only 2 parts
                        if len(parts) >= 3:
                            alert_title = ' | '.join(parts[2:])
                        else:
                            alert_title = parts[1]
                    else:
                        # Fall back to taking everything after the last pipe
                        last_pipe = title.rfind('|')
                        if last_pipe != -1:
                            alert_title = title[last_pipe + 1:].strip()
                elif len(parts) == 2:
                    # Only 2 parts - check if first looks like a brand prefix
                    first_part = parts[0]
                    if (len(first_part) <= 20 and 
                        not any(char in first_part for char in '()[]{}')):
                        alert_title = parts[1]
                    else:
                        # Keep original if first part doesn't look like a prefix
                        alert_title = title
                else:
                    # Only 1 part or no pipes - keep as is
                    alert_title = title
            
            # Create notification message using template
            # Build bullet points based on update number and flags
            bullets = []
            
            if update_number == 1:
                bullets.append(get_bullet_template("initial_sro_report").format(alert_title=alert_title))
                bullets.append(get_bullet_template("team_engaged").format(team_name=trimmed_policy))
            else:
                bullets.append(get_bullet_template("team_has").format(team_name=trimmed_policy))
            
            # Add downgrade bullet if downgrade flag is provided
            if downgrade:
                bullets.append(get_bullet_template("downgraded").format(new_severity=int(severity) + 1))
            
            # Add resolve bullet if resolve flag is provided
            if resolve:
                bullets.append(get_bullet_template("resolved"))
            
            # Add final bullet based on flags
            if resolve or downgrade:
                bullets.append(get_bullet_template("no_further_updates"))
            elif update_number == 1:
                bullets.append(get_bullet_template("further_updates_initial"))
            else:
                bullets.append(get_bullet_template("further_updates_followup"))
            
            # Create the notification message using template
            # Build prefix based on flags (can combine multiple)
            prefix_parts = []
            if resolve:
                prefix_parts.append(get_status_prefix("resolved"))
            if downgrade:
                prefix_parts.append(get_status_prefix("downgraded"))
            
            update_prefix = " | ".join(prefix_parts) + " | " if prefix_parts else ""
            
            # Format the notification using template functions
            header = format_header(severity, title, incident_number)
            update_line = format_update_line(update_prefix, update_number, created_at)
            footer = format_footer()
            
            notification_message = f"""{header}

{update_line}
{"\n".join(f"- {bullet}" for bullet in bullets)}

{footer}"""
            return notification_message.strip()
            
        except Exception as e:
            raise Exception(f"Error creating notification message: {e}")
    
    def get_user_teams(self, user_id: str) -> List[str]:
        """
        Get teams for a specific user from PagerDuty API.
        
        Args:
            user_id: The user ID
            
        Returns:
            List of team names the user belongs to
        """
        try:
            url = f"https://api.pagerduty.com/users/{user_id}"
            response = requests.get(url, headers=self.headers)
            
            if response.status_code == 200:
                user_data = response.json()
                teams = []
                for team in user_data.get('user', {}).get('teams', []):
                    team_name = team.get('summary', 'Unknown Team')
                    # Skip SRO US teams
                    if 'SRO US' not in team_name:
                        teams.append(team_name)
                return teams
            else:
                return []
        except Exception:
            return []
    
    def get_responders_data(self, incident_data: Dict) -> List[Dict]:
        """
        Get responders data in a structured format, ordered by request time.
        
        Args:
            incident_data: Incident data from PagerDuty API
            
        Returns:
            List of dictionaries containing responder information, ordered by request time
        """
        try:
            incident = incident_data.get('incident', {})
            responder_requests = incident.get('responder_requests', [])

            # List to store responders in order
            ordered_responders = []
            # Color mapping for groups - shared across escalation policies and user teams
            group_colors = {}
            
            # Process responder requests in chronological order (they're already sorted by request time)
            if responder_requests:
                for responder_request in responder_requests:
                    requested_at = responder_request.get('requested_at', '')
                    
                    for responder_target in responder_request.get('responder_request_targets', []):
                        responder_request_target = responder_target.get('responder_request_target', {})
                        target_type = responder_request_target.get('type', '')
                        team_name = responder_request_target.get('summary')

                        # Skip SRO US policy
                        if team_name and 'SRO US' in team_name:
                            continue
                        
                        # Handle escalation policy targets (only when we have a valid team name)
                        if target_type == 'escalation_policy' and team_name is not None and team_name != 'Unknown Team':
                            # Collect users for this team with their request times
                            team_users = []
                            for incident_responder in responder_request_target.get('incidents_responders', []):
                                user_name = incident_responder.get('user', {}).get('summary', 'Unknown')
                                
                                # Skip "Always On Call Service Account" user
                                if user_name == "Always On Call Service Account":
                                    continue
                                
                                # Get the user's individual request time
                                user_requested_at = incident_responder.get('requested_at') or requested_at
                                team_users.append({
                                    "name": user_name,
                                    "requested_at": user_requested_at
                                })
                            
                            # Add team to ordered responders if it has users
                            if team_users:
                                # Sort users by their individual request time
                                team_users.sort(key=lambda x: x.get('requested_at', '9999-12-31T23:59:59Z'))
                                ordered_responders.append({
                                    "team_name": team_name,
                                    "users": team_users,
                                    "color": self._get_color_for_group(team_name, group_colors),
                                    "type": "escalation_policy",
                                    "requested_at": requested_at
                                })
                        
                        
                        # Handle individual user targets (manually requested users)
                        if target_type == 'user':
                            for incident_responder in responder_request_target.get('incidents_responders', []):
                                user_name = incident_responder.get('user', {}).get('summary', 'Unknown')
                                user_id = incident_responder.get('user', {}).get('id')
                                
                                # Skip "Always On Call Service Account" user
                                if user_name == "Always On Call Service Account":
                                    continue
                                
                                # Get the user's individual request time
                                user_requested_at = incident_responder.get('requested_at') or requested_at
                                
                                # Look up teams for this user
                                if user_id:
                                    user_teams = self.get_user_teams(user_id)
                                    if user_teams:
                                        # For each user team, check if it matches any escalation policy color
                                        team_colors = []
                                        for team in user_teams:
                                            # Check if this team matches any escalation policy
                                            matching_color = self._find_matching_escalation_policy_color(team, group_colors)
                                            team_colors.append({
                                                "team": team,
                                                "color": matching_color  # Only assign color if it matches an escalation policy
                                            })
                                        
                                        ordered_responders.append({
                                            "user_name": user_name,
                                            "teams": team_colors,
                                            "type": "user_teams",
                                            "requested_at": user_requested_at
                                        })
                                    else:
                                        ordered_responders.append({
                                            "user_name": user_name,
                                            "teams": [{"team": "No teams found", "color": None}],
                                            "type": "user_teams",
                                            "requested_at": user_requested_at
                                        })
                                else:
                                    # Add user even without ID for debugging
                                    ordered_responders.append({
                                        "user_name": user_name,
                                        "teams": [{"team": "No user ID found", "color": None}],
                                        "type": "user_teams",
                                        "requested_at": user_requested_at
                                    })
            
            # If no escalation policy found, check incident.assignments
            if not responder_requests or not any(responder.get('users') or responder.get('user_name') for responder in ordered_responders):
                assignments = incident.get('assignments', [])
                for assignment in assignments:
                    assignee = assignment.get('assignee', {})
                    user_name = assignee.get('summary', 'Unknown')
                    user_id = assignee.get('id')
                    assignment_time = assignment.get('at', '0000-00-00T00:00:00Z')  # Use the 'at' field from assignment
                    
                    # Skip "Always On Call Service Account" user
                    if user_name == "Always On Call Service Account":
                        continue
                    
                    # Add individual user to ordered responders
                    if user_id:
                        user_teams = self.get_user_teams(user_id)
                        if user_teams:
                            # For each user team, check if it matches any escalation policy color
                            team_colors = []
                            for team in user_teams:
                                # Check if this team matches any escalation policy
                                matching_color = self._find_matching_escalation_policy_color(team, group_colors)
                                team_colors.append({
                                    "team": team,
                                    "color": matching_color  # Only assign color if it matches an escalation policy
                                })
                            
                            ordered_responders.append({
                                "user_name": user_name,
                                "teams": team_colors,
                                "type": "user_teams",
                                "requested_at": assignment_time  # Use actual assignment time
                            })
                        else:
                            ordered_responders.append({
                                "user_name": user_name,
                                "teams": [{"team": "No teams found", "color": None}],
                                "type": "user_teams",
                                "requested_at": assignment_time  # Use actual assignment time
                            })
            
            
            # Sort by requested_at timestamp to maintain chronological order
            ordered_responders.sort(key=lambda x: x.get('requested_at', '9999-12-31T23:59:59Z'))
            
            # Keep the requested_at field for display purposes
            return ordered_responders
            
        except Exception as e:
            raise Exception(f"Error getting responders data: {e}")
    
    def _get_color_for_group(self, group_name: str, color_map: Dict) -> str:
        """Get or assign a subtle color for a group name"""
        # Subtle, professional colors for escalation policies
        colors = [
            "#e3f2fd",  # Light blue
            "#f3e5f5",  # Light purple
            "#e8f5e8",  # Light green
            "#fff3e0",  # Light orange
            "#fce4ec",  # Light pink
            "#e0f2f1",  # Light teal
            "#f1f8e9",  # Light lime
            "#fff8e1",  # Light amber
            "#e8eaf6",  # Light indigo
            "#f3e5f5",  # Light deep purple
            "#e0f7fa",  # Light cyan
            "#f9fbe7",  # Light yellow
        ]
        
        trimmed_name = self._get_trimmed_policy_name(group_name)
        
        if trimmed_name not in color_map:
            # Assign next available color
            color_index = len(color_map) % len(colors)
            color_map[trimmed_name] = colors[color_index]
        
        return color_map[trimmed_name]
    
    def _find_matching_escalation_policy_color(self, team_name: str, color_map: Dict) -> Optional[str]:
        """
        Find if a team name matches any escalation policy and return its color.
        
        Args:
            team_name: The team name to match
            color_map: Dictionary of escalation policy names to colors
            
        Returns:
            Color if match found, None otherwise
        """
        trimmed_team = self._get_trimmed_policy_name(team_name)
        
        # Check for exact match with trimmed team name
        if trimmed_team in color_map:
            return color_map[trimmed_team]
        
        # Check if the trimmed team name matches any trimmed escalation policy name
        for policy_name, color in color_map.items():
            trimmed_policy = self._get_trimmed_policy_name(policy_name)
            if trimmed_team == trimmed_policy:
                return color
        
        return None
    
    def _get_trimmed_policy_name(self, policy_name: str) -> str:
        """Get the trimmed policy name by removing ' - High' suffix and similar patterns"""
        if ' - ' in policy_name:
            return policy_name.split(' - ')[0]
        return policy_name
    
    def add_note(self, incident_id: str, message: str) -> Dict:
        """
        Add a note to a PagerDuty incident.
        
        Args:
            incident_id: The PagerDuty incident ID
            message: The note message
            
        Returns:
            Dict containing success status and response data
        """
        try:
            # PagerDuty API endpoint for adding notes to incidents
            url = f"https://api.pagerduty.com/incidents/{incident_id}/notes"
            
            # Prepare the payload for adding a note
            payload = {
                "note": {
                    "content": message
                }
            }
            
            # Make the API request to add note
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 201:
                return {
                    "success": True,
                    "message": "Note added successfully",
                    "data": response.json()
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to add note: {response.status_code}",
                    "error": response.text
                }
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error adding note: {str(e)}")
        except Exception as e:
            raise Exception(f"Error adding note: {str(e)}")
    
    def get_incident_data_by_id(self, incident_id: str) -> Dict:
        """Get incident data by incident ID"""
        try:
            url = f"https://api.pagerduty.com/incidents/{incident_id}"
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"Failed to get incident data: {response.status_code}")
        except Exception as e:
            raise Exception(f"Error getting incident data: {str(e)}")
    
    def _format_status_update_template(self, incident_data: Dict, message: str, status: str, incident_id: str) -> str:
        """Format the status update using PagerDuty communication template"""
        try:
            incident = incident_data.get('incident', {})
            
            # Extract incident details
            incident_number = incident.get('incident_number', '')
            incident_title = incident.get('title', '')
            incident_status = incident.get('status', '').upper()
            created_at = incident.get('created_at', '')
            service = incident.get('service', {})
            service_name = service.get('summary', '')
            service_id = service.get('id', '')
            
            # Use the actual incident status from the API, not the status update parameter
            current_status = incident_status
            
            # Format dates
            created_date = self._format_pagerduty_date(created_at)
            updated_date = self._format_pagerduty_date(datetime.now(timezone.utc).isoformat())
            
            # Get current user from PagerDuty API
            current_user = self._get_current_user()
            
            # Build the HTML template
            html_template = f"""
<div style="font-family: Helvetica; font-size: 14px;">
<table style="width: 100%; border: none; cell-spacing: 0; cell-padding: 0;">
<tbody>
<tr>
<td>
<div><img src="https://business-response-customization.pdusercontent.com/images/logo/sa3zclicffwzsnvihdeevekl0c4hho2ni9mv9dcnls8=/chr3gvsifrl4nmtgnk5k7zzt6mcx6hm1b6oin306wvo=" alt="logo" width="200" height="45" style="display: block; margin: 24px auto 16px auto;"></div>
</td>
</tr>
<tr>
<td>
<div>
<p style="margin-bottom: 3px;"><b>Update</b></p>
<p></p>
<div style="white-space: pre-wrap; line-height: 1.5; margin: 20px 0;">{message}</div>
<p style="margin-bottom: 3px;"><b>Incident</b></p>
<a href="https://discoveryinc.pagerduty.com/incidents/{incident_id}">#<span>{incident_number} [{incident_status}] {incident_title}</span></a>
<p style="margin-bottom: 3px;"><b>Opened</b></p>
<span>{created_date}</span>
<p style="margin-bottom: 3px;"><b>Impacted Service</b></p>
<a href="https://discoveryinc.pagerduty.com/service-directory/{service_id}"><span>{service_name}</span></a>
<p style="margin-bottom: 3px;"><b>Current Status</b></p>
<span style="display: none;"> </span>
<div style="color: #d14905;"><span>{current_status.title()}</span></div>
<p>For more information,&nbsp;<a href="https://discoveryinc.pagerduty.com/status-dashboard/incidents/{incident_id}">visit the status page.</a></p>
</div>
</td>
</tr>
<tr>
<td><hr>
<p>Updated by <a href="https://discoveryinc.pagerduty.com/users/P8GYM6G"><span>{current_user}</span></a> at {updated_date}.</p>
</td>
</tr>
</tbody>
</table>
</div>
"""
            return html_template.strip()
            
        except Exception:
            # Fallback to simple message if template formatting fails
            return f"<p>{message}</p>"
    
    def _format_pagerduty_date(self, iso_date: str) -> str:
        """Format ISO date to PagerDuty format"""
        try:
            if not iso_date:
                return ""
            
            # Parse the ISO date
            dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
            
            # Convert to America/New_York timezone
            ny_tz = pytz.timezone('America/New_York')
            dt_ny = dt.astimezone(ny_tz)
            
            # Format as "MM/DD/YYYY HH:MMam/pm (America/New_York)"
            formatted = dt_ny.strftime("%m/%d/%Y %I:%M%p").lower()
            return f"{formatted} (America/New_York)"
            
        except Exception:
            return iso_date
    
    def _get_current_user(self) -> str:
        """Get current user information from PagerDuty API"""
        try:
            # Get current user from PagerDuty API
            url = "https://api.pagerduty.com/users/me"
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                user_data = response.json()
                user = user_data.get('user', {})
                first_name = user.get('first_name', '')
                last_name = user.get('last_name', '')
                if first_name and last_name:
                    return f"{first_name} {last_name}"
                elif first_name:
                    return first_name
                elif last_name:
                    return last_name
                else:
                    return user.get('name', 'System')
            else:
                return "System"
        except Exception:
            return "System"
    
    def get_custom_field_values(self, incident_id: str) -> Dict:
        """
        Get custom field values for a PagerDuty incident.
        
        Args:
            incident_id: The PagerDuty incident ID
            
        Returns:
            Dict containing custom field values for the incident, or empty dict if not available
            
        Note:
            Custom fields may not be available for all incidents or account types.
            Returns empty dict if custom fields are not configured or available.
        """
        try:
            url = f"https://api.pagerduty.com/incidents/{incident_id}/custom_fields/values"
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                # Custom fields not available for this incident
                return {
                    "custom_field_values": [],
                    "message": "No custom fields configured for this incident",
                    "available": False
                }
            else:
                raise Exception(f"Failed to get custom field values: {response.status_code} - {response.text}")
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error getting custom field values: {str(e)}")
        except Exception as e:
            raise Exception(f"Error getting custom field values: {str(e)}")
    

    def send_status_update(self, incident_id: str, status: str, message: str) -> Dict:
        """
        Send a status update to a PagerDuty incident.
        
        Args:
            incident_id: The PagerDuty incident ID
            status: The status update type (e.g., 'investigating', 'identified', 'monitoring', 'resolved')
            message: The status update message
            
        Returns:
            Dict containing success status and response data
        """
        try:
            # PagerDuty API endpoint for status updates
            url = f"https://api.pagerduty.com/incidents/{incident_id}/status_updates"
            
            # Prepare the payload for status update with PagerDuty communication template
            # Get incident data to populate template variables
            incident_data = self.get_incident_data_by_id(incident_id)
            
            # Extract incident details for subject
            incident = incident_data.get('incident', {})
            incident_title = incident.get('title', '')
            current_status = incident.get('status', '').upper()
            
            # Format the HTML message using the PagerDuty communication template
            html_message = self._format_status_update_template(
                incident_data, 
                message, 
                status,
                incident_id
            )
            
            payload = {
                "message": message,
                "subject": f"[PagerDuty Status]: {current_status.title()}: {incident_title}",
                "html_message": html_message
            }
            
            # Make the API request to send status update
            response = requests.post(
                url,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                # Also add a note with the same message
                note_result = self.add_note(incident_id, message)
                
                return {
                    "success": True,
                    "message": "Status update and note sent successfully",
                    "data": response.json(),
                    "note_result": note_result
                }
            else:
                return {
                    "success": False,
                    "message": f"Failed to send status update: {response.status_code}",
                    "error": response.text
                }
                
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error sending status update: {str(e)}")
        except Exception as e:
            raise Exception(f"Error sending status update: {str(e)}")
