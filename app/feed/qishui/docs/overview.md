# Qishui Music Playlist Parser

This tool parses and extracts playlist data from Qishui Music (汽水音乐) share URLs.

## How It Works

1. **Fetch HTML**: The service fetches the HTML page from the Qishui music share URL
2. **Parse `_ROUTER_DATA`**: Song list is read from the Modern.js router payload embedded in the page (`loaderData.playlist_page.medias`)
3. **Map Media**: Each track/video becomes `[song title, artist/album information]` (artists joined with `, `, then ` • album` when present)
4. **DOM Fallback**: If `_ROUTER_DATA` is missing, the legacy CSS/text scraper is used
5. **Format Output**: Returns a two-dimensional array of playlist items

## API Endpoint

- **Playlist**: `/api/feed/qishui/playlist?url={share_url}`

The endpoint requires authentication via `x-vv-token` header.
