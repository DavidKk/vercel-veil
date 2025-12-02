/**
 * Update windows: UTC 04:00, 12:00, 20:00 (each window lasts 1 hour)
 * Data is valid for 8 hours after each update
 */
export const UPDATE_WINDOWS = [4, 12, 20] as const
export const UPDATE_WINDOW_DURATION = 1 // 1 hour
export const DATA_VALIDITY_DURATION = 8 * 60 * 60 * 1000 // 8 hours in milliseconds

/**
 * GIST file name for anime cache
 * Note: GIST API does not support nested paths, so we use a simple filename
 */
export const GIST_FILE_NAME = 'anime.json'

/**
 * Result cache key
 */
export const RESULT_CACHE_KEY = 'anime-cache:result'
