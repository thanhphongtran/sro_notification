#!/usr/bin/env python3
# Standard library imports
import argparse
import os
import sys

# Third-party imports
from dotenv import load_dotenv

# Add the project root to Python path to allow app imports
project_root = os.path.join(os.path.dirname(__file__), '..', '..')
sys.path.insert(0, project_root)

# Import PagerDuty client module from services
from app.services.pagerduty_client import PagerDutyClient




def print_responders_data(responders_data):
    """
    Print responders data in a formatted way.
    
    Args:
        responders_data (list): List of responder data from PagerDutyCore
    """
    try:
        if not responders_data:
            print("No responders found.")
            return
        
        for responder in responders_data:
            if "team_name" in responder:
                # Team-based responder
                team_name = responder["team_name"]
                users = responder["users"]
                
                print(f"\n{team_name}:")
                for user in sorted(users, key=lambda x: x.get('name', '')):  # Sort users alphabetically by name
                    print(f"  - {user.get('name', 'Unknown')}")
                    
            elif "user_name" in responder:
                # Individual user with teams
                user_name = responder["user_name"]
                teams = responder["teams"]
                
                print(f"\n{user_name}:")
                for team_data in teams:
                    # Handle both old format (string) and new format (object with team and color)
                    if isinstance(team_data, dict):
                        team_name = team_data.get("team", "Unknown Team")
                    else:
                        team_name = team_data
                    print(f"  - {team_name}")
    
    except Exception as e:
        print(f"Error printing responders data: {e}")






def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Get PagerDuty incident details, notes, and timeline')
    parser.add_argument('ticket_number', help='PagerDuty incident/ticket number')
    parser.add_argument('update_number', type=int, nargs='?', help='Update number (optional, defaults to 1)')
    parser.add_argument('-r', '--resolve', action='store_true', help='Add "Resolved |" prefix to update line')
    parser.add_argument('-d', '--downgrade', action='store_true', help='Add "Downgraded |" prefix to update line')
    parser.add_argument('-u', '--users', action='store_true', help='Print incident responders')
    args = parser.parse_args()
    
    load_dotenv()
    
    PAGER_DUTY_TOKEN = os.getenv("PAGER_DUTY_TOKEN")
    
    if not PAGER_DUTY_TOKEN:
        print("Error: PAGER_DUTY_TOKEN environment variable not set")
        return
    
    try:
        # Initialize PagerDuty client
        pd_core = PagerDutyClient(token=PAGER_DUTY_TOKEN)
        
        # Get incident data
        incident_data = pd_core.get_incident_data(args.ticket_number)
        
        # Print the notification message using PagerDuty client
        update_number = args.update_number if args.update_number is not None else 1
        notification_message = pd_core.generate_notification_message(
            incident_data, args.ticket_number, update_number, args.resolve, args.downgrade
        )
        print(notification_message)
        
        # Print incident responders only if --users flag is provided
        if args.users:
            responders_data = pd_core.get_responders_data(incident_data)
            print_responders_data(responders_data)
        
        # Extract the incident ID for future use
        if 'incident' in incident_data and 'id' in incident_data['incident']:
            incident_id = incident_data['incident']['id']
            # print(f"Incident ID: {incident_id}")
        else:
            print(f"Warning: Could not extract incident ID from incident details for {args.ticket_number}")
        
    except Exception as e:
        print(f"Error: {e}")
        return


if __name__ == "__main__":
    main()
