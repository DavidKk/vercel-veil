/**
 * Constants for Maoyan API service
 */
export const MAOYAN = {
  /** Maoyan API base URL */
  API_BASE: atob('aHR0cHM6Ly9hcGlzLm5ldHN0YXJ0LmNuL21hb3lhbg=='),
  /** User-Agent header for API requests */
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
} as const

/**
 * Cache duration constants for Maoyan API requests
 * All durations are in milliseconds
 */
export const MAOYAN_CACHE = {
  /** Cache duration for top rated movies list (5 minutes) */
  TOP_RATED_MOVIES: 5 * 60 * 1000,
  /** Cache duration for most expected movies list (5 minutes) */
  MOST_EXPECTED: 5 * 60 * 1000,
} as const
