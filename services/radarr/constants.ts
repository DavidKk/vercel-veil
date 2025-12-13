/**
 * Constants for Radarr API service
 */
export const RADARR = {
  /** Default API version */
  API_VERSION: 'v3',
  /** Default headers */
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  } as const,
  /** Default User-Agent header - Mac browser to simulate browser access */
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
} as const
