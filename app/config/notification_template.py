"""
Notification template configuration
Customize the notification message format and content

Available Template Variables:
============================

Header Template Variables:
- {severity}        - Incident severity level (e.g., "1", "2", "3")
- {title}           - Full incident title
- {incident_url}    - Complete URL to the incident page

Update Template Variables:
- {update_prefix}   - Status prefixes (e.g., "Resolved |", "Downgraded |")
- {update_number}   - Update number (1, 2, 3, etc.)
- {created_at}      - Formatted creation/update timestamp

Bullet Template Variables:
- {alert_title}     - Cleaned alert title (removes everything before second pipe)
- {team_name}       - Team name (e.g., "Platform Team", "Infrastructure Team")
- {new_severity}    - New severity level (for downgraded incidents)

Footer Template Variables:
- {status_dashboard_url} - URL to the status dashboard

Status Prefix Variables:
- resolved          - Text for resolved incidents (default: "Resolved")
- downgraded        - Text for downgraded incidents (default: "Downgraded")

Example Usage:
=============

# Custom template with emojis
CUSTOM_TEMPLATE = NotificationTemplate(
    header_template="🚨 SEV {severity} | {title} | {incident_url}",
    bullet_templates={
        "initial_sro_report": '🔍 SRO US received a report stating "{alert_title}".',
        "team_engaged": "👥 The {team_name} team has engaged to investigate the incident.",
        "resolved": "✅ This incident is resolved."
    }
)

# Change the active template
ACTIVE_TEMPLATE = CUSTOM_TEMPLATE
"""

from typing import Dict, List
from dataclasses import dataclass


@dataclass
class NotificationTemplate:
    """Configuration for notification message templates"""
    
    # Header template - includes severity, title, and incident URL
    header_template: str = "SEV {severity} | {title} | {incident_url}"
    
    # Update line template
    update_template: str = "{update_prefix}Update {update_number} | {created_at}"
    
    # Bullet point templates for different scenarios
    bullet_templates: Dict[str, str] = None
    
    # Footer template
    footer_template: str = "Status Dashboard - {status_dashboard_url}"
    
    # Status prefix templates
    status_prefixes: Dict[str, str] = None
    
    def __post_init__(self):
        """Initialize default values if not provided"""
        if self.bullet_templates is None:
            self.bullet_templates = {
                "initial_sro_report": 'SRO US received a report stating "{alert_title}".',
                "team_engaged": "The {team_name} team has engaged to investigate the incident.",
                "team_has": "The {team_name} team ",
                # "downgraded": "The severity of this incident has been downgraded to a SEV {new_severity}.",
                "downgraded": "The severity of this incident has been downgraded.",
                "resolved": "This incident is resolved.",
                "no_further_updates": "No further updates will be provided for this incident.",
                "further_updates_initial": "Further updates will be provided as they become available.",
                "further_updates_followup": "Further updates will be provided within 2 hours."
            }
        
        if self.status_prefixes is None:
            self.status_prefixes = {
                "resolved": "Resolved",
                "downgraded": "Downgraded"
            }


# Default template configuration
DEFAULT_TEMPLATE = NotificationTemplate()

# Custom template examples (uncomment and modify as needed)
# CUSTOM_TEMPLATE = NotificationTemplate(
#     header_template="🚨 SEV {severity} | {title} | {incident_url}",
#     update_template="📝 {update_prefix}Update {update_number} | {created_at}",
#     bullet_templates={
#         "initial_sro_report": '🔍 SRO US received a report stating "{alert_title}".',
#         "team_engaged": "👥 The {team_name} team has engaged to investigate the incident.",
#         "team_has": "👥 The {team_name} team has",
#         "downgraded": "⬇️ The severity of this incident has been downgraded to a SEV {new_severity}.",
#         "resolved": "✅ This incident is resolved.",
#         "no_further_updates": "🔚 No further updates will be provided for this incident.",
#         "further_updates_initial": "⏳ Further updates will be provided as they become available.",
#         "further_updates_followup": "⏰ Further updates will be provided within 2 hours."
#     },
#     footer_template="📊 Status Dashboard - {status_dashboard_url}\n\n@here PR",
#     status_prefixes={
#         "resolved": "✅ Resolved",
#         "downgraded": "⬇️ Downgraded"
#     }
# )

# Active template (change this to use a different template)
ACTIVE_TEMPLATE = DEFAULT_TEMPLATE


def get_template() -> NotificationTemplate:
    """Get the active notification template"""
    return ACTIVE_TEMPLATE


def get_bullet_template(key: str) -> str:
    """Get a specific bullet template by key"""
    return ACTIVE_TEMPLATE.bullet_templates.get(key, "")


def get_status_prefix(key: str) -> str:
    """Get a status prefix by key"""
    return ACTIVE_TEMPLATE.status_prefixes.get(key, "")


def format_header(severity: str, title: str, incident_number: str) -> str:
    """Format the notification header"""
    incident_url = f"https://discoveryinc.pagerduty.com/incidents/{incident_number}"
    return ACTIVE_TEMPLATE.header_template.format(
        severity=severity,
        title=title,
        incident_url=incident_url
    )


def format_update_line(update_prefix: str, update_number: int, created_at: str) -> str:
    """Format the update line"""
    return ACTIVE_TEMPLATE.update_template.format(
        update_prefix=update_prefix,
        update_number=update_number,
        created_at=created_at
    )


def format_footer() -> str:
    """Format the notification footer"""
    return ACTIVE_TEMPLATE.footer_template.format(
        status_dashboard_url="https://discoveryinc.pagerduty.com/status-dashboard"
    )
