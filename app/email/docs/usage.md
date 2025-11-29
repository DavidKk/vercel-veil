# Usage Guide

## Step-by-Step Instructions

### 1. Select a Template

- Use the dropdown to select a template (Sonarr, Radarr, or Prowlarr)
- The template description will appear below the dropdown

### 2. Edit Variables

- The JSON text area shows the default variables for the selected template
- Edit the JSON to customize the content
- Invalid JSON will show an error message

### 3. View Preview

- The preview pane automatically updates when you change variables
- The iframe shows exactly how the email will render

### 4. Send Test Email

- Click "Send Test Email" to send a test notification
- The email will be sent to the configured recipient address
- Check your inbox to verify the email appearance

## External API Usage (Webhooks)

**Important**: This test page is for internal use only. External users should configure Sonarr/Radarr/Prowlarr to send webhooks directly to the webhook endpoints.

### Configuring Sonarr Webhook

1. Go to Sonarr Settings → Connect → Webhooks
2. Click the "+" button to add a new webhook
3. Configure:
   - **Name**: Any name (e.g., "Vercel Veil")
   - **URL**: `https://your-domain.com/api/webhooks/sonarr`
   - **Method**: `POST`
   - **On Grab**: ✓ (optional)
   - **On Download**: ✓ (recommended)
   - **On Upgrade**: ✓ (recommended)
   - **On Rename**: ✗ (optional)
   - **On Series Delete**: ✗ (optional)
   - **On Episode File Delete**: ✗ (optional)
   - **On Health Issue**: ✗ (optional)
4. Add Basic Authentication:
   - **Username**: Your `API_USERNAME` value
   - **Password**: Your `API_PASSWORD` value
5. Add Custom Header (optional but recommended):
   - **Name**: `x-vv-token` (or your `API_TOKEN_HEADER` value)
   - **Value**: Your `API_TOKEN_SECRET` value
6. Save the webhook

### Configuring Radarr Webhook

1. Go to Radarr Settings → Connect → Webhooks
2. Click the "+" button to add a new webhook
3. Configure:
   - **Name**: Any name (e.g., "Vercel Veil")
   - **URL**: `https://your-domain.com/api/webhooks/radarr`
   - **Method**: `POST`
   - **On Grab**: ✓ (optional)
   - **On Download**: ✓ (recommended)
   - **On Upgrade**: ✓ (recommended)
   - **On Rename**: ✗ (optional)
   - **On Movie Delete**: ✗ (optional)
   - **On Health Issue**: ✗ (optional)
4. Add Basic Authentication:
   - **Username**: Your `API_USERNAME` value
   - **Password**: Your `API_PASSWORD` value
5. Add Custom Header (required if `API_TOKEN_SECRET` is configured):
   - **Name**: `x-vv-token` (or your `API_TOKEN_HEADER` value)
   - **Value**: Your `API_TOKEN_SECRET` value
6. Save the webhook

### Configuring Prowlarr Webhook

1. Go to Prowlarr Settings → Connect → Webhooks
2. Click the "+" button to add a new webhook
3. Configure:
   - **Name**: Any name (e.g., "Vercel Veil")
   - **URL**: `https://your-domain.com/api/webhooks/prowlarr`
   - **Method**: `POST`
   - **On Health**: ✓ (recommended - for indexer status changes)
   - **On Application Update**: ✗ (optional)
   - **On Indexer Update**: ✓ (optional)
   - **On Indexer Delete**: ✓ (optional)
   - **On Indexer Added**: ✓ (optional)
4. Add Basic Authentication:
   - **Username**: Your `API_USERNAME` value
   - **Password**: Your `API_PASSWORD` value
5. Add Custom Header (optional but recommended):
   - **Name**: `x-vv-token` (or your `API_TOKEN_HEADER` value)
   - **Value**: Your `API_TOKEN_SECRET` value
6. Save the webhook

### Webhook Payload Examples

#### Sonarr Webhook Payload

```json
{
  "eventType": "Download",
  "series": {
    "id": 123,
    "title": "Stranger Things",
    "path": "/tv/Stranger Things",
    "tvdbId": 305288,
    "tvMazeId": 2993,
    "imdbId": "tt4574334",
    "type": "Standard",
    "year": 2016
  },
  "episodes": [
    {
      "id": 456,
      "episodeNumber": 1,
      "seasonNumber": 1,
      "title": "Chapter One: The Vanishing of Will Byers",
      "airDate": "2016-07-15",
      "airDateUtc": "2016-07-15T12:00:00Z",
      "quality": "HDTV-720p",
      "qualityVersion": 1,
      "releaseGroup": "RARBG",
      "sceneName": "Stranger.Things.S01E01.720p.HDTV.x264-RARBG"
    }
  ]
}
```

#### Radarr Webhook Payload

```json
{
  "eventType": "Download",
  "movie": {
    "id": 789,
    "title": "The Matrix",
    "year": 1999,
    "path": "/movies/The Matrix (1999)",
    "tmdbId": 603,
    "imdbId": "tt0133093"
  },
  "remoteMovie": {
    "title": "The Matrix",
    "year": 1999
  },
  "release": {
    "quality": "Bluray-1080p",
    "qualityVersion": 1,
    "releaseGroup": "RARBG",
    "releaseTitle": "The.Matrix.1999.1080p.BluRay.x264-RARBG"
  }
}
```

#### Prowlarr Webhook Payload

```json
{
  "eventType": "IndexerStatusChange",
  "instanceName": "prowlarr-main",
  "applicationUrl": "http://localhost:9696",
  "indexer": {
    "id": 1,
    "name": "RARBG",
    "protocol": "torrent",
    "enableRss": true,
    "enableAutomaticSearch": true,
    "enableInteractiveSearch": true,
    "priority": 1
  },
  "previousStatus": "Healthy",
  "newStatus": "Unhealthy",
  "message": "Indexer is no longer responding to requests"
}
```

### Testing Webhooks Manually

You can test webhooks using curl:

```bash
# Test Sonarr webhook
curl -X POST "https://your-domain.com/api/webhooks/sonarr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "x-vv-token: your_api_token" \
  -d '{
    "eventType": "Download",
    "series": {
      "title": "Test Series",
      "year": 2024
    },
    "episodes": [
      {
        "title": "Test Episode",
        "seasonNumber": 1,
        "episodeNumber": 1
      }
    ]
  }'

# Test Radarr webhook
curl -X POST "https://your-domain.com/api/webhooks/radarr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -H "x-vv-token: your_api_token" \
  -d '{
    "eventType": "Download",
    "movie": {
      "title": "Test Movie",
      "year": 2024
    }
  }'

# Test Prowlarr webhook
curl -X POST "https://your-domain.com/api/webhooks/prowlarr" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:password' | base64)" \
  -d '{
    "eventType": "IndexerStatusChange",
    "indexer": {
      "name": "Test Indexer",
      "protocol": "torrent"
    },
    "previousStatus": "Healthy",
    "newStatus": "Unhealthy",
    "message": "Test notification"
  }'
```

## Tips

- Use valid JSON format for variables in the test page
- Check available variables list below the JSON editor
- Preview updates in real-time as you type
- Test emails are marked with "[Preview]" in the subject line
- **Sonarr/Radarr webhooks**: Require Basic Auth (username/password) and optionally header token
- **Prowlarr webhook**: Requires Basic Auth (username/password) only
- **API endpoints**: Support cookie (for test pages), header token, or Basic Auth
- The username/password must match `API_USERNAME` and `API_PASSWORD` environment variables
- The header token (if used) must match the `API_TOKEN_SECRET` environment variable
