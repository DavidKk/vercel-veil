# Usage Guide

## Page Features

### 1. Browse Movie List

- The page automatically loads and displays the merged movie list
- Each movie card shows:
  - Poster image
  - Movie title
  - Maoyan rating (if available)
  - Wish count (if available)
  - TMDB rating and year (if matched)
  - Movie overview (from TMDB)

### 2. Movie Card Information

**Source Label**:

- If a movie appears in both lists, it will show a "Both Lists" badge

**Rating Information**:

- Yellow star icon: Maoyan rating
- Pink heart icon: Wish count

**TMDB Information**:

- Year badge
- TMDB rating (if available)
- Movie overview (up to 3 lines)

### 3. Action Buttons

- **View Details**: Navigate to TMDB movie details page
- **Favorite**: Add to TMDB favorites list (requires TMDB user authentication configuration)

### 4. Refresh Data

Click the "Refresh" button in the top right corner to reload the latest movie list.

## Responsive Design

- **Mobile**: Single column layout, cards full width
- **Tablet**: 2 column layout
- **Desktop**: 3-4 column layout, making full use of screen space

## Favorite Feature

### Configure TMDB Authentication

To use the favorite feature, you need to configure the `TMDB_SESSION_ID` environment variable. Session ID is long-term valid and won't expire. Configure once and use it long-term.

### Get Session ID

Follow these steps to get a Session ID:

#### Step 1: Get TMDB API Key

**Important**: The favorite feature uses **API Key (API Key)**, not API Read Access Token.

1. Visit [TMDB website](https://www.themoviedb.org/) and register/login to your account
2. Go to [Account Settings](https://www.themoviedb.org/settings/api) → **API** page
3. In the **API Key (v3 auth)** section:
   - If you already have an API Key, copy and use it
   - If not, click **Request an API Key** to apply
   - Select **Developer** as the application type
4. Copy your **API Key** (format like: `abc123def456...`)

**Note**: Do not use **API Read Access Token**. The favorite feature requires **API Key** + **Session ID** combination.

#### Step 2: Get Request Token (Temporary, used to exchange for Session ID)

**Method 1: Using Command Line**

Run the following command in your terminal (replace `YOUR_API_KEY` with your actual API Key):

```bash
curl "https://api.themoviedb.org/3/authentication/token/new?api_key=YOUR_API_KEY"
```

**Method 2: Direct Browser Access**

Enter the following URL in your browser address bar (replace `YOUR_API_KEY` with your actual API Key):

```
https://api.themoviedb.org/3/authentication/token/new?api_key=YOUR_API_KEY
```

Response example:

```json
{
  "success": true,
  "expires_at": "2025-12-31 23:59:59 UTC",
  "request_token": "abc123def456ghi789..."
}
```

**Important**: Copy the `request_token` value, you'll need it in the next step.

#### Step 3: User Authorization (Must Complete)

**Important**: This step must be completed immediately after Step 2, as request_token expires quickly.

Visit the following URL in your browser (replace `YOUR_REQUEST_TOKEN` with the token obtained in Step 2):

```
https://www.themoviedb.org/authenticate/YOUR_REQUEST_TOKEN
```

**Example**: If your request_token is `abc123def456ghi789`, visit:

```
https://www.themoviedb.org/authenticate/abc123def456ghi789
```

On the opened page:

1. **Confirm you are logged in to your TMDB account** (if not, login first)
2. Click **Allow** or **Approve** button to authorize the application
3. After seeing "Success!" or similar success message, authorization is complete

**Note**:

- After authorization, this request_token can be used
- If authorization fails, you need to re-execute Step 2 to get a new request_token

#### Step 4: Exchange for Session ID (Long-term Valid)

**Method 1: Using Command Line**

Run the following command (replace `YOUR_API_KEY` and `YOUR_REQUEST_TOKEN` with actual values):

```bash
curl -X POST "https://api.themoviedb.org/3/authentication/session/new?api_key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "accept: application/json" \
  -d "{\"request_token\":\"YOUR_REQUEST_TOKEN\"}"
```

Response example:

```json
{
  "success": true,
  "session_id": "xyz789abc123def456..."
}
```

**Important**: Copy the `session_id` value (this is long-term valid and won't expire).

**Method 2: Using Browser with Postman/Insomnia**

You can also use tools like Postman or Insomnia to make the POST request:

- URL: `https://api.themoviedb.org/3/authentication/session/new?api_key=YOUR_API_KEY`
- Method: POST
- Headers:
  - `Content-Type: application/json`
  - `accept: application/json`
- Body (JSON):
  ```json
  {
    "request_token": "YOUR_REQUEST_TOKEN"
  }
  ```

#### Step 5: Set Environment Variable

Add the obtained `session_id` to your environment variables:

```bash
# .env or .env.local file
TMDB_SESSION_ID=xyz789abc123def456...
```

Or add to Vercel or other deployment platform environment variables:

- Variable name: `TMDB_SESSION_ID`
- Variable value: session_id obtained in Step 4

**Note**:

- `TMDB_SESSION_ID` is long-term valid and won't expire (unless user actively revokes it)
- Configure once, use long-term, no need to update frequently
- Only need to configure `TMDB_SESSION_ID`, no need for `TMDB_REQUEST_TOKEN`

#### Using Favorite Feature

After configuration:

- Click the "Favorite" button on movie cards
- Movies will be added to your TMDB account favorites list
- If Radarr and TMDB accounts are linked, they will automatically sync

**Note**:

- `TMDB_SESSION_ID` is long-term valid and won't expire, configure once and use long-term
- If you change TMDB accounts, you need to get a new session_id
- Keep your session_id secure and don't share it with others
- Favorite feature requires `TMDB_SESSION_ID` configuration, otherwise an error will be displayed

## Notes

1. Initial load may take some time as it needs to call multiple APIs
2. If TMDB API is not configured, Maoyan data will still be displayed, but without TMDB supplementary information
3. Some movies may not be found in TMDB, original Maoyan data will be retained
4. Data is updated regularly, recommend checking daily for latest recommendations
5. Favorite feature requires `TMDB_SESSION_ID` configuration, otherwise an error will be displayed
