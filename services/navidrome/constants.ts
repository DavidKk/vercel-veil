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
  /** Default User-Agent header */
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const

/**
 * Cache configuration constants for Navidrome API requests
 */
export const NAVIDROME_CACHE = {
  /** Default cache TTL in seconds (60 seconds) */
  DEFAULT_TTL: 60,
} as const
