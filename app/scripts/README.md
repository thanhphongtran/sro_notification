# PagerDuty CLI Scripts

This directory contains command-line utilities for working with PagerDuty incidents.

## Scripts

### create_notification.py

A CLI tool for generating PagerDuty incident notifications and viewing responder information.

**Usage:**
```bash
# From the pager_duty_notification directory
python -m app.scripts.create_notification <ticket_number> [update_number] [options]

# Examples:
python -m app.scripts.create_notification INC123456
python -m app.scripts.create_notification INC123456 2
python -m app.scripts.create_notification INC123456 2 --resolve
python -m app.scripts.create_notification INC123456 1 --downgrade --users
```

**Options:**
- `-r, --resolve`: Add "Resolved |" prefix to update line
- `-d, --downgrade`: Add "Downgraded |" prefix to update line  
- `-u, --users`: Print incident responders with team information

**Features:**
- Generate formatted notification messages
- View incident responder information
- Support for multiple update types (initial, follow-up, resolved, downgraded)
- Color-coded team information
- Chronological ordering of responders

**Environment Variables:**
- `PAGER_DUTY_TOKEN`: Required PagerDuty API token

## Dependencies

The scripts use the PagerDuty client from `../services/pagerduty_client.py` and require the same dependencies as the main FastAPI application.

## Integration with Web UI

The CLI script shares the same business logic as the web interface, ensuring consistency between command-line and web-based operations. Both use the same:
- PagerDuty API client
- Notification template system
- Responder data processing
- Date formatting utilities
