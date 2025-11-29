/**
 * Constants for TMDB API service
 */
export const TMDB = {
  /** TMDB API base URL */
  API_BASE_URL: atob('aHR0cHM6Ly9hcGkudGhlbW92aWVkYi5vcmcvMw=='),
} as const

// Legacy export for backward compatibility
export const TMDB_API_BASE_URL = TMDB.API_BASE_URL

/**
 * Cache duration constants for TMDB API requests
 * All durations are in milliseconds
 */
export const TMDB_CACHE = {
  /** Cache duration for search requests (10 minutes) */
  SEARCH: 10 * 60 * 1000,
  /** Cache duration for movie details requests (30 minutes) */
  MOVIE_DETAILS: 30 * 60 * 1000,
} as const
