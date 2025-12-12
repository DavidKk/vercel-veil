/**
 * Type definitions for Cloudflare detection
 */

/**
 * Cloudflare blocking reason type
 */
export type CloudflareBlockReason = 'geo-blocked' | 'rate-limited' | 'ip-blocked' | 'ddos-protection' | 'browser-verification' | 'unknown'

/**
 * Result of Cloudflare blocking check
 */
export interface CloudflareCheckResult {
  /** Whether the URL is blocked by Cloudflare */
  isBlocked: boolean
  /** Reason for blocking (if blocked) */
  reason?: string
  /** Detailed blocking reason type */
  blockReason?: CloudflareBlockReason
  /** Detected Cloudflare indicators */
  indicators: string[]
  /** HTTP status code of the response */
  statusCode?: number
  /** Whether the response is from Cloudflare */
  isCloudflareResponse: boolean
  /** Response headers */
  headers?: Record<string, string>
  /** Response body snippet (first 500 chars) */
  bodySnippet?: string
  /** Full error message if available */
  errorMessage?: string
}

/**
 * Options for checking Cloudflare blocking
 */
export interface CloudflareCheckOptions {
  /** Request timeout in milliseconds */
  timeout?: number
  /** Whether to check response body content */
  checkBody?: boolean
  /** Custom headers to include in the request */
  headers?: Record<string, string>
  /** Request method (default: 'HEAD' for efficiency) */
  method?: 'GET' | 'HEAD'
}
