/**
 * Constants for Navidrome API service
 */
export const NAVIDROME = {
  /** Default Subsonic API parameters */
  DEFAULT_PARAMS: {
    /** Subsonic API version */
    v: '1.16.1',
    /** Client identifier */
    c: 'vercel-veil',
    /** Response format */
    f: 'json',
  } as const,
} as const

/**
 * Cache configuration constants for Navidrome API requests
 */
export const NAVIDROME_CACHE = {
  /** Default cache TTL in seconds (60 seconds) */
  DEFAULT_TTL: 60,
} as const
