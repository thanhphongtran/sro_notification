# Notification Template Configuration

This directory contains configuration files for customizing the PagerDuty notification messages and communication templates.

## Files

- `notification_template.py` - Main template configuration file
- `config.py` - Application configuration settings
- `README.md` - This documentation file

## Template System Overview

The notification system uses a flexible template configuration that supports:
- **Notification Messages**: For Slack and general notifications
- **Status Update Templates**: For PagerDuty communication templates
- **Customizable Formatting**: Headers, bullets, footers, and status prefixes

### Two Template Types

1. **Notification Templates** (`notification_template.py`): Used for generating Slack messages and general notifications
2. **PagerDuty Communication Templates**: Built-in HTML templates used for status updates sent directly to PagerDuty incidents

## Customizing Notification Templates

### Basic Customization

To customize the notification messages, edit the `notification_template.py` file and modify the `DEFAULT_TEMPLATE` or create a new template.

### Available Template Variables

#### Header Template
- `{severity}` - Incident severity (e.g., "1", "2", "3")
- `{title}` - Incident title
- `{incident_url}` - Full URL to the incident

#### Update Template
- `{update_prefix}` - Status prefixes (e.g., "Resolved |", "Downgraded |")
- `{update_number}` - Update number (1, 2, 3, etc.)
- `{created_at}` - Formatted creation/update time

#### Bullet Templates
- `{alert_title}` - Cleaned alert title (for initial_sro_report)
- `{team_name}` - Team name (for team_engaged, team_has)
- `{new_severity}` - New severity level (for downgraded)

#### Footer Template
- `{status_dashboard_url}` - Status dashboard URL

### Example Customizations

#### 1. Add Emojis to Messages

```python
CUSTOM_TEMPLATE = NotificationTemplate(
    header_template="🚨 SEV {severity} | {title} | {incident_url}",
    update_template="📝 {update_prefix}Update {update_number} | {created_at}",
    bullet_templates={
        "initial_sro_report": '🔍 SRO US received a report stating "{alert_title}".',
        "team_engaged": "👥 The {team_name} team has been engaged to investigate the incident.",
        "team_has": "👥 The {team_name} team has",
        "downgraded": "⬇️ The severity of this incident has been downgraded to a SEV {new_severity}.",
        "resolved": "✅ This incident is resolved.",
        "no_further_updates": "🔚 No further updates will be provided for this incident.",
        "further_updates_initial": "⏳ Further updates will be provided as they become available.",
        "further_updates_followup": "⏰ Further updates will be provided within 2 hours."
    },
    footer_template="📊 Status Dashboard - {status_dashboard_url}\n\n@here PR",
    status_prefixes={
        "resolved": "✅ Resolved",
        "downgraded": "⬇️ Downgraded"
    }
)
```

#### 2. Change Message Format

```python
CUSTOM_TEMPLATE = NotificationTemplate(
    header_template="INCIDENT: SEV-{severity} | {title} | {incident_url}",
    update_template="UPDATE {update_number}: {update_prefix}{created_at}",
    bullet_templates={
        "initial_sro_report": 'SRO US Alert: "{alert_title}"',
        "team_engaged": "Response Team: {team_name} is investigating",
        # ... other templates
    }
)
```

#### 3. Add Custom Status Prefixes

```python
CUSTOM_TEMPLATE = NotificationTemplate(
    status_prefixes={
        "resolved": "RESOLVED",
        "downgraded": "DOWNGRADED",
        "escalated": "ESCALATED",  # Add new status
        "investigating": "INVESTIGATING"  # Add new status
    }
)
```

### Activating Custom Templates

To use a custom template, change the `ACTIVE_TEMPLATE` variable in `notification_template.py`:

```python
# Change this line:
ACTIVE_TEMPLATE = DEFAULT_TEMPLATE

# To this:
ACTIVE_TEMPLATE = CUSTOM_TEMPLATE
```

### Template Functions

The system provides several utility functions for template formatting:

- `get_template()` - Get the active notification template
- `get_bullet_template(key)` - Get a specific bullet template by key
- `get_status_prefix(key)` - Get a status prefix by key
- `format_header(severity, title, incident_number)` - Format the notification header
- `format_update_line(update_prefix, update_number, created_at)` - Format the update line
- `format_footer()` - Format the notification footer

### Template Validation

The system includes built-in validation:
- Missing template variables are handled gracefully
- Fallback to default templates if API fails
- Error logging for debugging

### Testing Changes

1. Modify the template in `notification_template.py`
2. Restart the server: `python run.py`
3. Test with a sample incident
4. Check both backend API and frontend generation

### API Endpoint

You can also retrieve the current template configuration via API:

```bash
curl http://localhost:8080/api/template
```

This returns the current template configuration in JSON format.

## PagerDuty Communication Templates

The system also includes built-in HTML templates for PagerDuty status updates. These templates are automatically applied when sending status updates through the web interface or API.

### Features

- **Professional HTML Formatting**: Matches PagerDuty's official communication style
- **Dynamic Content**: Automatically populates incident details, user information, and timestamps
- **Responsive Design**: Works well in PagerDuty's web interface and email notifications
- **Brand Consistency**: Includes Discovery Inc. branding and styling

### Template Variables

The PagerDuty communication templates include:
- `{message}` - The status update message content
- `{incident_number}` - PagerDuty incident number
- `{incident_title}` - Incident title
- `{incident_status}` - Current incident status
- `{created_date}` - Incident creation date
- `{service_name}` - Impacted service name
- `{current_status}` - Current incident status
- `{current_user}` - User's first and last name
- `{updated_date}` - Status update timestamp

### Customization

PagerDuty communication templates are defined in the `PagerDutyClient` class and can be customized by modifying the `_format_status_update_template` method in `app/services/pagerduty_client.py`.

## Best Practices

1. **Test Changes**: Always test template changes with real incident data
2. **Backup**: Keep a backup of working templates
3. **Version Control**: Commit template changes to version control
4. **Documentation**: Document any custom templates for team members
5. **Consistency**: Maintain consistent formatting across all templates

## Troubleshooting

### Template Not Loading
- Check server logs for errors
- Verify template syntax is correct
- Ensure all required variables are present

### Variables Not Replacing
- Check variable names match exactly (case-sensitive)
- Verify variable names in template strings
- Check for typos in variable names

### Frontend Not Updating
- Clear browser cache
- Check browser console for JavaScript errors
- Verify API endpoint is accessible
