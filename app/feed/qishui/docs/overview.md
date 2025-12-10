# Qishui Music Playlist Parser

This tool parses and extracts playlist data from Qishui Music (汽水音乐) share URLs.

## How It Works

1. **Fetch HTML**: The service fetches the HTML page from the Qishui music share URL
2. **Parse HTML**: The HTML is parsed using CSS selectors to find the playlist element
3. **Extract Text**: Text content is extracted from the target element (simulating browser innerText behavior)
4. **Process Data**: The text is processed according to the playlist format:
   - Split by numbered separators (`\n数字\n`)
   - Each part is split by newlines and filtered
   - Converted to playlist item format: `[song title, artist/album information]`
5. **Format Output**: Returns a two-dimensional array of playlist items

## API Endpoint

- **Playlist**: `/api/feed/qishui/playlist?url={share_url}`

The endpoint requires authentication via `x-vv-token` header.
