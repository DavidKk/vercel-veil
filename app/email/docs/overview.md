# Email Templates Preview

This page allows you to preview and test email templates used for notifications.

## How It Works

1. **Template Selection**: Choose a template from the dropdown (Sonarr, Radarr, or Prowlarr templates)
2. **Variable Input**: Edit the JSON variables in the text area to customize the template content
3. **Live Preview**: The preview pane shows how the email will look with your variables
4. **Test Email**: Send a test email to verify the template works correctly

## Available Templates

### Sonarr Template

For TV series download/upgrade notifications from Sonarr.

**Key Variables**:

- `seriesTitle`: The title of the TV series
- `episodeList`: Formatted list of episodes
- `eventType`: Event type (Download, Upgrade, etc.)
- `releaseDetails`: Quality, release group, size information
- `coverImage`: Series poster image URL
- `synopsis`: Series overview/description

### Radarr Template

For movie download/upgrade notifications from Radarr.

**Key Variables**:

- `movieTitle`: The title of the movie
- `year`: Release year
- `eventType`: Event type (Download, Upgrade, etc.)
- `releaseDetails`: Quality, release group, size information
- `coverImage`: Movie poster image URL
- `synopsis`: Movie overview/description

### Prowlarr Template

For indexer status change/update notifications from Prowlarr.

**Key Variables**:

- `indexerName`: The name of the indexer
- `protocol`: Indexer protocol (Torrent/Usenet)
- `eventType`: Event type (IndexerStatusChange, IndexerUpdate, etc.)
- `statusChange`: Status change information
- `indexerDetails`: Protocol, priority, RSS/search settings
- `message`: Additional notification message

## Preview Mechanism

The preview uses server actions to render the email template with provided variables and displays it in an iframe. This ensures the preview matches exactly how the email will appear in email clients.

## External API Usage

**Note**: The preview and test email functionality on this page is for internal testing only. External users should use the webhook APIs to send email notifications.

### Webhook APIs (For External Users)

#### Sonarr Webhook

**Endpoint**: `POST /api/webhooks/sonarr`

**Description**: Receives Sonarr webhook events and sends email notifications using the Sonarr template.

**Authentication**: Required via `x-vv-token` header

**Request Body**: Native Sonarr webhook JSON payload

**Example Request**:

```bash
curl -X POST "https://your-domain.com/api/webhooks/sonarr" \
  -H "Content-Type: application/json" \
  -H "x-vv-token: your_webhook_token" \
  -d '{
    "eventType": "Download",
    "series": {
      "title": "Stranger Things",
      "year": 2016
    },
    "episodes": [
      {
        "title": "Chapter One: The Vanishing of Will Byers",
        "seasonNumber": 1,
        "episodeNumber": 1
      }
    ]
  }'
```

**Response**:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "source": "sonarr",
    "eventType": "Download"
  }
}
```

#### Radarr Webhook

**Endpoint**: `POST /api/webhooks/radarr`

**Description**: Receives Radarr webhook events and sends email notifications using the Radarr template.

**Authentication**: Required via `x-vv-token` header

**Request Body**: Native Radarr webhook JSON payload

**Example Request**:

```bash
curl -X POST "https://your-domain.com/api/webhooks/radarr" \
  -H "Content-Type: application/json" \
  -H "x-vv-token: your_webhook_token" \
  -d '{
    "eventType": "Download",
    "movie": {
      "title": "The Matrix",
      "year": 1999
    }
  }'
```

**Response**:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "source": "radarr",
    "eventType": "Download"
  }
}
```

#### Prowlarr Webhook

**Endpoint**: `POST /api/webhooks/prowlarr`

**Description**: Receives Prowlarr webhook events and sends email notifications using the Prowlarr template. Prowlarr is an indexer manager that manages all your indexers in one place.

**Authentication**: Required via `x-vv-token` header

**Request Body**: Native Prowlarr webhook JSON payload

**Supported Event Types**:

- `Test`: Test webhook
- `IndexerStatusChange`: Indexer status changed (e.g., Healthy → Unhealthy)
- `IndexerUpdate`: Indexer configuration updated
- `IndexerDelete`: Indexer deleted
- `IndexerAdded`: New indexer added

**Example Request**:

```bash
curl -X POST "https://your-domain.com/api/webhooks/prowlarr" \
  -H "Content-Type: application/json" \
  -H "x-vv-token: your_webhook_token" \
  -d '{
    "eventType": "IndexerStatusChange",
    "indexer": {
      "name": "RARBG",
      "protocol": "torrent"
    },
    "previousStatus": "Healthy",
    "newStatus": "Unhealthy",
    "message": "Indexer is no longer responding"
  }'
```

**Response**:

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "source": "prowlarr",
    "eventType": "IndexerStatusChange"
  }
}
```

## Environment Variables Required

- `RESEND_API_KEY`: Resend API key for sending emails
- `NOTIFICATION_EMAIL_FROM`: Sender email address
- `NOTIFICATION_EMAIL_TO`: Default recipient email address
- `WEBHOOK_TOKEN_SECRET`: Token for webhook authentication (must match the token sent in `x-vv-token` header)
