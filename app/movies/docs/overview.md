# Movie Recommendations

## Overview

The Movie Recommendations page integrates two popular lists from Maoyan Movies:

1. **Top Rated Movies** - From Maoyan's top-rated movies list
2. **Most Expected Movies** - From Maoyan's most expected movies list

The system automatically:

- Merges both lists and removes duplicates (by matching movie titles)
- Enriches movie details through TMDB API (posters, overviews, ratings, release years, etc.)
- Displays unified movie cards for easy browsing and decision-making

## Data Sources

- **Maoyan Movies API**: Provides top-rated and most expected movie lists
- **TMDB (The Movie Database)**: Provides detailed movie information, posters, overviews, and other metadata

## Use Cases

This page is primarily used for:

- Daily browsing of recommended movies to discover quality content
- Viewing movie details and ratings
- Learning more through TMDB links
- Syncing to TMDB favorites list (automatically syncs if Radarr and TMDB accounts are linked)
