# Usage Guide

## Step-by-Step Instructions

### 1. Get Qishui Music Playlist Share URL

- Open Qishui Music app or website
- Navigate to the playlist you want to parse
- Click the share button to get the share URL
- Copy the complete URL (format: `https://music.douyin.com/qishui/share/playlist?playlist_id=...`)

### 2. Enter URL and Parse

- Paste the share URL into the input field
- Click "Parse Playlist" to fetch and parse the playlist
- View the parsed JSON result

## Output Format

The API returns a two-dimensional array where each item is:

```json
[
  ["Song Title", "Artist • Album"],
  ["Another Song", "Another Artist • Another Album"]
]
```

Each playlist item is an array with:

- First element: Song title
- Second element: Artist and album information (separated by `•`)

## Authentication

This API uses token-based authentication. The token must be provided in the `x-vv-token` header when calling the API directly.
