/**
 * Constants for Cloudflare detection
 */

/**
 * Cloudflare response header identifiers
 */
export const CLOUDFLARE_HEADERS = {
  /** Cloudflare Ray ID header */
  CF_RAY: 'cf-ray',
  /** Cloudflare Request ID header */
  CF_REQUEST_ID: 'cf-request-id',
  /** Server header indicating Cloudflare */
  SERVER: 'server',
  /** Cloudflare server value */
  SERVER_VALUE: 'cloudflare',
} as const

/**
 * Cloudflare challenge page indicators in response body
 */
export const CLOUDFLARE_CHALLENGE_INDICATORS = [
  'just a moment',
  'checking your browser',
  'cf-browser-verification',
  'cloudflare',
  'ddos protection',
  'ray id',
  'cf-ray',
  'please wait',
  'access denied',
  'cf-error-details',
  'error 1000',
  'error 1015',
  'error 1020',
  'error 1033',
  'error 1040',
] as const

/**
 * Cloudflare blocking reason patterns
 */
export const CLOUDFLARE_BLOCK_REASONS = {
  /** Geographic restrictions */
  GEO_BLOCKED: ['access denied', 'not available in your country', 'geographic restrictions', 'region blocked', 'country blocked', 'location restricted'],
  /** Rate limiting */
  RATE_LIMITED: ['rate limit', 'too many requests', '429', 'quota exceeded'],
  /** IP blocked */
  IP_BLOCKED: ['ip blocked', 'ip address blocked', 'your ip has been banned', 'ip banned'],
  /** DDoS protection */
  DDOS_PROTECTION: ['ddos protection', 'under attack mode', 'security check'],
  /** Browser verification */
  BROWSER_VERIFICATION: ['browser verification', 'checking your browser', 'just a moment'],
} as const

/**
 * HTTP status codes that may indicate Cloudflare blocking
 */
export const CLOUDFLARE_BLOCK_STATUS_CODES = [403, 429, 503] as const

/**
 * Default timeout for Cloudflare check requests (in milliseconds)
 */
export const CLOUDFLARE_CHECK_TIMEOUT = 10000 // 10 seconds
