# Navidrome Music Search

This tool provides search functionality for music through the Navidrome API.

## How It Works

1. **Single Search**: Search for songs using a query string
   - Searches through Navidrome's search3.view endpoint
   - Returns matching songs with metadata (title, artist, album, duration, cover art)
2. **Batch Search**: Search for multiple queries in parallel
   - Executes up to 50 queries in parallel per batch
   - Automatically deduplicates results by song ID
   - Returns both individual query results and merged song list

## API Endpoints

- **Single Query**: `GET /api/music/query?q={search_query}`
  - Returns array of matching songs
- **Batch Query**: `POST /api/music/batch-query`
  - Request body: `{ "queries": ["query1", "query2", ...] }`
  - Returns object with `queries` (array of query results) and `songs` (merged deduplicated list)

Both endpoints require authentication via `x-vv-token` header.

## Features

- **Caching**: Responses are cached in memory for 60 seconds (configurable)
- **Deduplication**: Batch search automatically removes duplicate songs
- **Error Handling**: Individual query failures don't stop the entire batch
- **Subsonic Protocol**: Uses Navidrome's Subsonic-compatible API
