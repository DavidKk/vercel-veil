# Douban RSS Feed Converter

This tool converts Douban RSS feeds into formats compatible with Sonarr and Radarr.

## How It Works

1. **Fetch RSS Feed**: The service fetches the Douban RSS feed from the provided URL
2. **Parse XML**: The RSS XML is parsed to extract series/movie information
3. **Extract Metadata**:
   - Title and Chinese title extraction
   - Season number conversion (Chinese numbers to Arabic)
   - Douban ID extraction
4. **Metadata Enrichment**:
   - Searches TMDB or TheTVDB for additional metadata
   - Adds TMDB ID, TVDB ID, IMDb ID when available
   - Determines media type (series or movie)
5. **Format Output**: Returns JSON format compatible with Sonarr/Radarr

## API Endpoints

- **Sonarr**: `/api/feed/douban/sonarr?url={rss_url}`
- **Radarr**: `/api/feed/douban/radarr?url={rss_url}`

Both endpoints require authentication via `x-vv-token` header.
