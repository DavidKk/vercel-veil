# Usage Guide

## Step-by-Step Instructions

### 1. Get Douban RSS URL

- Go to your Douban profile interests page
- Copy the RSS feed URL (format: `https://www.douban.com/feed/people/{Your_Douban_ID}/interests`)

### 2. Select Feed Type

- **Sonarr**: For TV series (filters to series only)
- **Radarr**: For movies (filters to movies only)

### 3. Enter URL and Test

- Paste the RSS URL into the input field
- Click "Run Test" to fetch and convert the feed
- View the converted JSON result

## Output Format

The API returns an array of series/movie objects with:

- `title`: English title
- `chineseTitle`: Chinese title (if available)
- `tmdbId`: The Movie Database ID
- `tvdbId`: TheTVDB ID
- `imdbId`: IMDb ID
- `doubanId`: Douban ID
- `mediaType`: "series" or "movie"
- `seasons`: Array with season information

## Authentication

This API uses token-based authentication. The token must be provided in the `x-vv-token` header when calling the API directly.
