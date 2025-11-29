# Email Templates Preview

This page allows you to preview and test email templates used for notifications.

## How It Works

1. **Template Selection**: Choose a template from the dropdown (e.g., Sonarr or Radarr templates)
2. **Variable Input**: Edit the JSON variables in the text area to customize the template content
3. **Live Preview**: The preview pane shows how the email will look with your variables
4. **Test Email**: Send a test email to verify the template works correctly

## Template Variables

Each template has predefined variables that can be customized:

- `seriesTitle`: The title of the series/movie
- `episodeTitle`: The episode title (for TV series)
- `seasonNumber`: Season number
- `episodeNumber`: Episode number
- `quality`: Video quality information
- `releaseGroup`: Release group name
- And more...

## Preview Mechanism

The preview uses an iframe that loads a dedicated API endpoint (`/api/templates/[id]/preview`), which renders pure HTML without any host page styles. This ensures the preview matches exactly how the email will appear in email clients.
