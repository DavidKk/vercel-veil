/**
 * Constants for TheTVDB API service
 */
export const THETVDB = {
  /** TheTVDB API base URL */
  API_BASE_URL: atob('aHR0cHM6Ly9hcGk0LnRoZXR2ZGIuY29tL3Y0'),
} as const

/**
 * Cache configuration constants for TheTVDB API requests
 */
export const THETVDB_CACHE = {
  /** Token expiration time in milliseconds (50 minutes) */
  TOKEN_EXPIRATION_TIME: 50 * 60 * 1000,
} as const

// Legacy exports for backward compatibility
export const TOKEN_EXPIRATION_TIME = THETVDB_CACHE.TOKEN_EXPIRATION_TIME
export const TVDB_API_BASE_URL = THETVDB.API_BASE_URL
