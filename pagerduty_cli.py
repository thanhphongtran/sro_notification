#!/usr/bin/env python3
"""
Standalone PagerDuty CLI Tool
A self-contained script for generating PagerDuty incident notifications from the command line.

Usage:
    pagerduty_cli.py <ticket_number> [update_number] [options]

Examples:
    pagerduty_cli.py INC123456
    pagerduty_cli.py INC123456 2
    pagerduty_cli.py INC123456 2 --resolve
    pagerduty_cli.py INC123456 1 --downgrade --users

Add to your zshrc:
    alias pd='/path/to/pagerduty_cli.py'
    # Then use: pd INC123456 --users
"""

import argparse
import os
import sys
import requests
from datetime import datetime, timezone
from typing import Dict, List, Optional
import json

# Check for required dependencies
try:
    import pytz
except ImportError:
    print("Error: pytz is required. Install with: pip install pytz")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # dotenv is optional - we can work without it
    pass


class PagerDutyCLI:
    """Standalone PagerDuty CLI client"""
    
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            'Accept': 'application/vnd.pagerduty+json;version=2',
            'Content-Type': 'application/json',
            'Authorization': f'Token token={self.token}'
        }
    
    def get_incident_data(self, ticket_number: str) -> Dict:
        """Get incident data from PagerDuty API"""
        try:
            # First try to get incident by number
            url = f"https://api.pagerduty.com/incidents?incident_number={ticket_number}"
            response = requests.get(url, headers=self.headers, timeout=30)
            
            if response.status_code != 200:
                raise Exception(f"Failed to fetch incident: {response.status_code} - {response.text}")
            
            data = response.json()
            if not data.get('incidents'):
                raise Exception(f"No incident found with number {ticket_number}")
            
            incident = data['incidents'][0]
            incident_id = incident['id']
            
            # Get detailed incident data
            detail_url = f"https://api.pagerduty.com/incidents/{incident_id}"
            detail_response = requests.get(detail_url, headers=self.headers, timeout=30)
            
            if detail_response.status_code != 200:
                raise Exception(f"Failed to fetch incident details: {detail_response.status_code}")
            
            return detail_response.json()
            
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {str(e)}")
    
    def convert_utc_to_eastern(self, utc_date_string: str) -> str:
        """Convert UTC datetime to Eastern time"""
        try:
            # Parse the UTC datetime
            utc_dt = datetime.fromisoformat(utc_date_string.replace('Z', '+00:00'))
            
            # Convert to Eastern timezone
            eastern = pytz.timezone('US/Eastern')
            eastern_dt = utc_dt.astimezone(eastern)
            
            # Format as desired
            return eastern_dt.strftime('%m/%d/%Y %I:%M %p %Z')
        except Exception as e:
            return f"Error converting date: {e}"
    
    def get_responders_data(self, incident_data: Dict) -> List[Dict]:
        """Get responders data from incident"""
        try:
            incident = incident_data.get('incident', {})
            assignments = incident.get('assignments', [])
            
            responders = []
            for assignment in assignments:
                assignee = assignment.get('assignee', {})
                if assignee.get('type') == 'user':
                    user_name = assignee.get('summary', 'Unknown User')
                    responders.append({
                        'user_name': user_name,
                        'teams': ['Unknown Team']  # Simplified for CLI
                    })
            
            return responders
        except Exception as e:
            print(f"Error getting responders: {e}")
            return []
    
    def generate_notification_message(
        self, 
        incident_data: Dict, 
        ticket_number: str, 
        update_number: int = 1, 
        resolve: bool = False, 
        downgrade: bool = False
    ) -> str:
        """Generate notification message"""
        try:
            incident = incident_data['incident']
            title = incident['title']
            incident_number = incident['incident_number']
            priority = incident.get('priority', {}).get('name', 'Unknown')
            escalation_policy = incident.get('escalation_policy', {}).get('summary', 'Unknown')
            
            # Determine date
            if update_number == 1:
                created_at = self.convert_utc_to_eastern(incident['created_at'])
            else:
                current_utc = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
                created_at = self.convert_utc_to_eastern(current_utc)
            
            # Build status prefix
            status_prefix = ""
            if resolve:
                status_prefix = "Resolved | "
            elif downgrade:
                status_prefix = "Downgraded | "
            
            # Simple notification template
            severity = priority[-1] if priority else "?"
            team_name = escalation_policy.split(' - ')[0] if ' - ' in escalation_policy else escalation_policy
            
            message = f"""🔴 **P{severity} Incident Update {update_number}** 🔴

**{status_prefix}Update {update_number} | {created_at}**

**Incident:** {title}
**Ticket:** {incident_number}
**Priority:** {priority}
**Team:** {team_name}

**Conference Bridge:** TBD
**Slack Channel:** TBD

**Status:** Investigating the issue and will provide updates as more information becomes available."""
            
            return message
            
        except Exception as e:
            raise Exception(f"Error generating notification: {str(e)}")
    
    def print_responders_data(self, responders_data: List[Dict]) -> None:
        """Print responders data in formatted way"""
        try:
            if not responders_data:
                print("No responders found.")
                return
            
            print("\n--- Incident Responders ---")
            for responder in responders_data:
                if "team_name" in responder:
                    team_name = responder["team_name"]
                    users = responder["users"]
                    
                    print(f"\n{team_name}:")
                    for user in sorted(users, key=lambda x: x.get('name', '')):
                        print(f"  - {user.get('name', 'Unknown')}")
                        
                elif "user_name" in responder:
                    user_name = responder["user_name"]
                    teams = responder["teams"]
                    
                    print(f"\n{user_name}:")
                    for team_data in teams:
                        if isinstance(team_data, dict):
                            team_name = team_data.get("team", "Unknown Team")
                        else:
                            team_name = team_data
                        print(f"  - {team_name}")
        
        except Exception as e:
            print(f"Error printing responders data: {e}")


def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description='Generate PagerDuty incident notifications',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s INC123456                    # Basic notification
  %(prog)s INC123456 2                  # Update #2
  %(prog)s INC123456 2 --resolve        # Resolved update
  %(prog)s INC123456 1 --users          # Show responders
  
Environment Variables:
  PAGER_DUTY_TOKEN    Required PagerDuty API token
        """
    )
    
    parser.add_argument('ticket_number', help='PagerDuty incident/ticket number')
    parser.add_argument('update_number', type=int, nargs='?', default=1, 
                       help='Update number (default: 1)')
    parser.add_argument('-r', '--resolve', action='store_true', 
                       help='Add "Resolved |" prefix to update line')
    parser.add_argument('-d', '--downgrade', action='store_true', 
                       help='Add "Downgraded |" prefix to update line')
    parser.add_argument('-u', '--users', action='store_true', 
                       help='Print incident responders')
    parser.add_argument('--token', help='PagerDuty API token (overrides env var)')
    
    args = parser.parse_args()
    
    # Get API token
    token = args.token or os.getenv("PAGER_DUTY_TOKEN")
    if not token:
        print("Error: PagerDuty API token required!")
        print("Set PAGER_DUTY_TOKEN environment variable or use --token")
        print("\nTo get a token:")
        print("1. Log into PagerDuty web interface")
        print("2. Go to Profile → User Settings")
        print("3. Create API User Token")
        sys.exit(1)
    
    try:
        # Initialize CLI client
        cli = PagerDutyCLI(token)
        
        # Get incident data
        print(f"Fetching incident {args.ticket_number}...")
        incident_data = cli.get_incident_data(args.ticket_number)
        
        # Generate and print notification
        notification = cli.generate_notification_message(
            incident_data, 
            args.ticket_number, 
            args.update_number, 
            args.resolve, 
            args.downgrade
        )
        
        print("\n" + "="*60)
        print("NOTIFICATION MESSAGE")
        print("="*60)
        print(notification)
        print("="*60)
        
        # Print responders if requested
        if args.users:
            responders = cli.get_responders_data(incident_data)
            cli.print_responders_data(responders)
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
