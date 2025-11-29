# Usage Guide

## Step-by-Step Instructions

### Single Search

1. **Enter Query**: Type a search query in the input field (e.g., song title, artist name, or album)
2. **Select API Type**: Choose "Single Query" from the dropdown
3. **Run Test**: Click "Run Test" to execute the search
4. **View Results**: See the matching songs with details (title, artist, album, duration)

### Batch Search

1. **Enter Queries**: Type multiple search queries, one per line, in the textarea
2. **Select API Type**: Choose "Batch Query" from the dropdown
3. **Run Test**: Click "Run Test" to execute all searches in parallel
4. **View Results**:
   - See individual query results with matched song IDs
   - See merged song list (deduplicated)

## Response Format

### Single Query Response

Array of song objects:

```json
[
  {
    "id": "song-id",
    "title": "Song Title",
    "artist": "Artist Name",
    "album": "Album Name",
    "duration": 180,
    "cover": "cover-art-id"
  }
]
```

### Batch Query Response

Object with query results and merged songs:

```json
{
  "queries": [
    {
      "query": "search term",
      "songsIds": ["id1", "id2", ...]
    }
  ],
  "songs": [
    {
      "id": "song-id",
      "title": "Song Title",
      ...
    }
  ]
}
```

## Tips

- Use specific search terms for better results
- Batch queries are processed in chunks of 50
- Results are cached for 60 seconds
- Songs are automatically deduplicated by ID in batch searches
- Individual query failures in batch mode return empty results for that query
