/**
 * Cache duration constants for fetch requests
 * All durations are in milliseconds
 */
export const FETCH_CACHE = {
  /** Default cache duration (5 minutes) */
  DEFAULT_DURATION: 5 * 60 * 1000,
} as const

/**
 * Cache size management constants
 */
export const FETCH_CACHE_SIZE = {
  /** Maximum cache size to prevent memory issues */
  MAX_SIZE: 100,
  /** Cleanup threshold - clean when cache reaches this size (80% of max) */
  CLEANUP_THRESHOLD: 80,
} as const

/**
 * Headers that affect response caching
 * Only these headers are included in cache key generation
 */
export const CACHEABLE_HEADERS = ['accept', 'authorization', 'user-agent'] as const
