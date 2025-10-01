# SRO Notification System

A modern web interface for generating PagerDuty incident notifications, managing status updates, and adding notes, built with FastAPI.

## Features

- ⚡ **Fast API** - Built with FastAPI for high performance
- 🔍 **API Documentation** - Automatic OpenAPI/Swagger docs
- 📝 **Status Updates** - Send formatted status updates with PagerDuty communication templates
- 📌 **Add Notes** - Add notes to incidents directly from the web interface
- 🔗 **Slack Integration** - Send notifications to Slack channels
- 👥 **Responder Information** - View incident responders
- 📋 **Status Updates Trail** - View chronological history of all status updates
- ⏱️ **Real-time Timer** - Live timer showing time since last status update

## Quick Start

### 1. Install Dependencies

```bash
cd pager_duty_notification
pip3 install -r requirements.txt
```

### 2. Configure Environment

Copy the example environment file and set your PagerDuty token:

```bash
cp env.example .env
```

#### Generate PagerDuty API Token

1. Log into PagerDuty on the web
2. Click on your profile in the top right corner
3. Select "My Profile"
4. Go to "User Settings"
5. Click "Create API User token"
6. Copy the generated token

#### Configure Environment Variables

Edit the `.env` file and add your PagerDuty token:

```bash
# Edit .env and add your PAGER_DUTY_TOKEN
PAGER_DUTY_TOKEN=your_token_here
```

> **Note:** For Slack integration, the application currently uses Phong's SRO_PEER_Review Slack App. If you need the webhook URL, please contact Phong directly.

### 3. Run the Application

```bash
python3 run.py
```


### 4. Access the Web Interface

Open your browser and go to: http://127.0.0.1:8080

## API Endpoints

- `GET /` - Web interface
- `POST /api/generate` - Generate notification message
- `GET /api/incident/{ticket_number}` - Get incident data
- `GET /api/incident/{ticket_number}/responders` - Get incident responders
- `POST /api/slack/send` - Send notification to Slack
- `GET /api/template` - Get notification template configuration
- `POST /api/status-update` - Send status update to PagerDuty incident
- `POST /api/add-note` - Add note to PagerDuty incident
- `GET /api/incident/{incident_id}/status-updates` - Get status updates trail
- `GET /api/incident/{incident_id}/notes` - Get incident notes
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation (ReDoc)
- `GET /health` - Health check endpoint

### Custom Fields API
- `GET /api/incident/{incident_id}/custom-fields` - Get all custom field values for a PagerDuty incident

## Configuration

The application can be configured using environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PAGER_DUTY_TOKEN` | Required | Your PagerDuty API token |
| `SLACK_WEBHOOK_URL` | Optional | Slack webhook URL to send Peer Reviews |
| `HOST` | `127.0.0.1` | Host to bind the server |
| `PORT` | `8080` | Port to bind the server |
| `DEBUG` | `false` | Enable debug mode |

## Development

### Project Structure

```
pager_duty_notification/
├── app/
│   ├── main.py                    # FastAPI application entry point
│   ├── api/
│   │   └── incidents.py           # API routes for incident operations
│   ├── config/
│   │   ├── config.py              # Application configuration
│   │   ├── notification_template.py # Notification template configuration
│   │   └── README.md              # Template configuration documentation
│   ├── models/
│   │   └── incident.py            # Pydantic data models
│   ├── services/
│   │   ├── pagerduty_client.py    # PagerDuty API client (pure Python)
│   │   ├── pagerduty_service.py   # FastAPI service wrapper
│   │   └── slack_service.py       # Slack integration service
│   ├── scripts/
│   │   ├── create_notification.py # CLI script for notifications
│   │   └── README.md              # CLI usage documentation
│   ├── static/                    # Static files (CSS, JS, images)
│   │   ├── images/
│   │   │   └── Slack_Symbol_0.svg # Slack logo
│   │   ├── script.js              # Frontend JavaScript
│   │   └── styles.css             # Frontend styles
│   └── templates/
│       └── index.html             # Web interface template
├── venv/                          # Python virtual environment
├── requirements.txt               # Python dependencies
├── env.example                    # Environment variables example
├── run.py                         # Alternative run script
└── README.md                      # This file
```

### Running in Development Mode

```bash
# Install development dependencies
pip3 install -r requirements.txt

# Run with auto-reload
uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
```

## Usage Examples

### Web Interface

1. Open http://127.0.0.1:8080 in your browser
2. Enter a PagerDuty ticket number (e.g., 2668960)
3. Configure options (update number, resolve, downgrade, show users)
4. Click "Generate Notification" to create a notification message
5. Click "Send Status Update" to send a formatted status update to PagerDuty
6. Click "Add Note" to add a note to the incident
7. Use "Send to Slack" to send notifications to Slack channels
8. View the **Status Updates Trail** to see chronological history of all updates
9. Monitor the **real-time timer** showing time since last status update

### API Usage

```bash
# Generate a notification
curl -X POST "http://127.0.0.1:8080/api/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "ticket_number": "P123456",
    "update_number": 1,
    "resolve": false,
    "downgrade": false,
    "show_users": true
  }'

# Get incident data
curl "http://127.0.0.1:8080/api/incident/2668960"

# Get status updates trail
curl "http://127.0.0.1:8080/api/incident/Q0JLPBVWNHTUDW/status-updates"

# Get incident notes
curl "http://127.0.0.1:8080/api/incident/Q0JLPBVWNHTUDW/notes"

# Send status update
curl -X POST "http://127.0.0.1:8080/api/status-update" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "Q0JLPBVWNHTUDW",
    "status": "investigating",
    "message": "Investigating the issue"
  }'

# Add note to incident
curl -X POST "http://127.0.0.1:8080/api/add-note" \
  -H "Content-Type: application/json" \
  -d '{
    "incident_id": "Q0JLPBVWNHTUDW",
    "message": "Added a note to the incident"
  }'

# Send to Slack
curl -X POST "http://127.0.0.1:8080/api/slack/send" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test notification",
    "channel": "#alerts"
  }'

# Get all custom field values for an incident
curl "http://127.0.0.1:8080/api/incident/Q0JLPBVWNHTUDW/custom-fields"
```

### Custom Fields Usage

Custom fields allow you to store additional metadata with PagerDuty incidents. This endpoint helps you retrieve all custom field information for an incident:

**Get All Custom Fields:**
```bash
curl "http://127.0.0.1:8080/api/incident/Q0JLPBVWNHTUDW/custom-fields"
```

**Response Example:**
```json
{
  "custom_field_values": [
    {
      "id": "P123456",
      "name": "Severity Level",
      "value": "High",
      "type": "single_value"
    },
    {
      "id": "P789012",
      "name": "Environment",
      "value": "Production",
      "type": "single_value"
    }
  ]
}
```

**Note:** If custom fields are not available or accessible, the API will return appropriate error messages or empty data structures.

## Integration with CLI Script

This web UI uses the same business logic as your original CLI script (`create_pagerduty_notification.py`). You can:

1. Use the CLI for quick terminal-based operations
2. Use the web UI for a more user-friendly experience
3. Use the API for integration with other tools

## Troubleshooting

### Common Issues

1. **"PAGER_DUTY_TOKEN environment variable not set"**
   - Make sure you've created a `.env` file with your token
   - Check that the token is valid and has the right permissions

2. **"Failed to fetch incident"**
   - Verify the ticket number is correct
   - Check that your PagerDuty token has access to the incident

3. **Port already in use**
   - Change the port in your `.env` file or use `--port` with uvicorn

### Debug Mode

Enable debug mode for more detailed error messages:

```bash
# Set DEBUG=true in .env file
# Or run with debug flag
uvicorn app.main:app --reload --log-level debug
```

## Roadmap / TODO

### Planned Features

- [ ] **Attach username to PRs**
- [ ] **Future Feature**

### Bugs to Fix

- [ ] **Bugs**

### In Progress

- [ ] **Fix history of status updates are truncated issue**

### Completed

- [x] **Completed Feature** - Already implemented

## License

This project is part of your SRO notification system.
