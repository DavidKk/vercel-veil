import { debug, fail, warn } from '@/services/logger'

import { CLOUDFLARE_BLOCK_REASONS, CLOUDFLARE_BLOCK_STATUS_CODES, CLOUDFLARE_CHALLENGE_INDICATORS, CLOUDFLARE_CHECK_TIMEOUT, CLOUDFLARE_HEADERS } from './constants'
import type { CloudflareBlockReason, CloudflareCheckOptions, CloudflareCheckResult } from './types'

/**
 * Check if a response is from Cloudflare
 * @param response HTTP response object
 * @returns Whether the response is from Cloudflare
 */
export function isCloudflareResponse(response: Response): boolean {
  const server = response.headers.get(CLOUDFLARE_HEADERS.SERVER)
  const cfRay = response.headers.get(CLOUDFLARE_HEADERS.CF_RAY)
  const cfRequestId = response.headers.get(CLOUDFLARE_HEADERS.CF_REQUEST_ID)

  return server?.toLowerCase() === CLOUDFLARE_HEADERS.SERVER_VALUE || !!cfRay || !!cfRequestId
}

/**
 * Check if response is likely an HTML page (e.g., Cloudflare challenge page)
 * This is useful for detecting when a JSON API returns HTML instead
 * @param response HTTP response object
 * @returns Whether the response is likely HTML
 */
export function isHtmlResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || ''
  return contentType.toLowerCase().includes('text/html')
}

/**
 * Check if response body contains Cloudflare challenge indicators
 * @param bodyText Response body text
 * @returns Array of detected indicators
 */
function detectChallengeIndicators(bodyText: string): string[] {
  const lowerBody = bodyText.toLowerCase()
  const detected: string[] = []

  for (const indicator of CLOUDFLARE_CHALLENGE_INDICATORS) {
    if (lowerBody.includes(indicator.toLowerCase())) {
      detected.push(indicator)
    }
  }

  return detected
}

/**
 * Detect specific blocking reason from response body
 * @param bodyText Response body text
 * @returns Detected blocking reason type
 */
function detectBlockReason(bodyText: string): CloudflareBlockReason | undefined {
  const lowerBody = bodyText.toLowerCase()

  // Check for geographic blocking
  for (const pattern of CLOUDFLARE_BLOCK_REASONS.GEO_BLOCKED) {
    if (lowerBody.includes(pattern)) {
      return 'geo-blocked'
    }
  }

  // Check for rate limiting
  for (const pattern of CLOUDFLARE_BLOCK_REASONS.RATE_LIMITED) {
    if (lowerBody.includes(pattern)) {
      return 'rate-limited'
    }
  }

  // Check for IP blocking
  for (const pattern of CLOUDFLARE_BLOCK_REASONS.IP_BLOCKED) {
    if (lowerBody.includes(pattern)) {
      return 'ip-blocked'
    }
  }

  // Check for DDoS protection
  for (const pattern of CLOUDFLARE_BLOCK_REASONS.DDOS_PROTECTION) {
    if (lowerBody.includes(pattern)) {
      return 'ddos-protection'
    }
  }

  // Check for browser verification
  for (const pattern of CLOUDFLARE_BLOCK_REASONS.BROWSER_VERIFICATION) {
    if (lowerBody.includes(pattern)) {
      return 'browser-verification'
    }
  }

  return undefined
}

/**
 * Extract response headers as plain object
 * @param response HTTP response object
 * @returns Headers as plain object
 */
function extractHeaders(response: Response): Record<string, string> {
  const headers: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    headers[key] = value
  })
  return headers
}

/**
 * Check if a URL is blocked by Cloudflare
 * @param url URL to check
 * @param options Check options
 * @returns Cloudflare check result
 */
export async function checkCloudflareBlocked(url: string, options: CloudflareCheckOptions = {}): Promise<CloudflareCheckResult> {
  const { timeout = CLOUDFLARE_CHECK_TIMEOUT, checkBody = true, headers = {}, method = 'HEAD' } = options

  const indicators: string[] = []
  let statusCode: number | undefined
  let isFromCloudflare = false
  let isBlocked = false
  let reason: string | undefined
  let blockReason: CloudflareBlockReason | undefined
  let responseHeaders: Record<string, string> | undefined
  let bodySnippet: string | undefined
  let errorMessage: string | undefined

  try {
    debug(`Checking Cloudflare blocking for URL: ${url}`)

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...headers,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    statusCode = response.status
    responseHeaders = extractHeaders(response)

    // Check if response is from Cloudflare
    isFromCloudflare = isCloudflareResponse(response)

    if (isFromCloudflare) {
      indicators.push('cloudflare-headers')

      // Check for Cloudflare headers
      if (response.headers.get(CLOUDFLARE_HEADERS.CF_RAY)) {
        indicators.push('cf-ray-header')
      }
      if (response.headers.get(CLOUDFLARE_HEADERS.CF_REQUEST_ID)) {
        indicators.push('cf-request-id-header')
      }
    }

    // Check status code
    if (CLOUDFLARE_BLOCK_STATUS_CODES.includes(response.status as (typeof CLOUDFLARE_BLOCK_STATUS_CODES)[number])) {
      indicators.push(`status-${response.status}`)

      if (response.status === 403) {
        isBlocked = true
        reason = 'HTTP 403 Forbidden - Likely blocked by Cloudflare'
        blockReason = 'unknown'
      } else if (response.status === 429) {
        isBlocked = true
        reason = 'HTTP 429 Too Many Requests - Rate limited by Cloudflare'
        blockReason = 'rate-limited'
      } else if (response.status === 503) {
        isBlocked = true
        reason = 'HTTP 503 Service Unavailable - Cloudflare protection active'
        blockReason = 'ddos-protection'
      }
    }

    // Check response body if enabled (always check for non-2xx responses)
    const shouldCheckBody = checkBody && (method === 'GET' || !response.ok)
    if (shouldCheckBody) {
      try {
        const bodyText = await response.text()
        bodySnippet = bodyText.substring(0, 500) // Store first 500 chars

        const bodyIndicators = detectChallengeIndicators(bodyText)
        if (bodyIndicators.length > 0) {
          indicators.push(...bodyIndicators.map((ind) => `body-${ind}`))
          isBlocked = true

          // Detect specific blocking reason
          const detectedReason = detectBlockReason(bodyText)
          if (detectedReason) {
            blockReason = detectedReason

            // Generate detailed reason message
            if (detectedReason === 'geo-blocked') {
              reason = 'Geographic restrictions - Service is not available in your country/region'
            } else if (detectedReason === 'rate-limited') {
              reason = 'Rate limited - Too many requests, blocked by Cloudflare'
            } else if (detectedReason === 'ip-blocked') {
              reason = 'IP blocked - Your IP address has been banned by Cloudflare'
            } else if (detectedReason === 'ddos-protection') {
              reason = 'DDoS protection active - Cloudflare is protecting this service'
            } else if (detectedReason === 'browser-verification') {
              reason = 'Browser verification required - Cloudflare verification needed'
            } else {
              reason = `Cloudflare challenge page detected: ${bodyIndicators.join(', ')}`
            }
          } else {
            reason = `Cloudflare challenge page detected: ${bodyIndicators.join(', ')}`
            blockReason = 'unknown'
          }
        }
      } catch (error) {
        warn(`Failed to read response body for Cloudflare check: ${error}`)
        if (error instanceof Error) {
          errorMessage = error.message
        }
      }
    }

    // If we detected Cloudflare but no specific blocking, still mark as potential issue
    if (isFromCloudflare && !isBlocked && response.status !== 200) {
      isBlocked = true
      reason = `Cloudflare response with status ${response.status} - Possibly blocked`
      blockReason = 'unknown'
    }
  } catch (error) {
    if (error instanceof Error) {
      errorMessage = error.message
      if (error.name === 'AbortError') {
        fail(`Cloudflare check timeout for URL: ${url}`)
        isBlocked = true
        reason = 'Request timeout - Possibly blocked by Cloudflare'
        blockReason = 'unknown'
        indicators.push('timeout')
      } else {
        fail(`Cloudflare check failed for URL: ${url}`, error.message)
        // Network errors might indicate blocking, but we can't be sure
        indicators.push('network-error')
      }
    } else {
      fail(`Cloudflare check failed for URL: ${url}`, String(error))
      errorMessage = String(error)
      indicators.push('unknown-error')
    }
  }

  const result: CloudflareCheckResult = {
    isBlocked,
    reason,
    blockReason,
    indicators,
    statusCode,
    isCloudflareResponse: isFromCloudflare,
    headers: responseHeaders,
    bodySnippet,
    errorMessage,
  }

  if (isBlocked) {
    warn(`Cloudflare blocking detected for ${url}:`, result)
  } else {
    debug(`Cloudflare check passed for ${url}:`, result)
  }

  return result
}

/**
 * Check if a failed HTTP response is due to Cloudflare blocking
 * This is useful for checking responses from service requests that have already failed
 * @param response HTTP response object (may be from a failed request)
 * @param url Optional URL for logging
 * @returns Cloudflare check result
 */
export async function checkResponseForCloudflareBlocking(response: Response, url?: string): Promise<CloudflareCheckResult> {
  const indicators: string[] = []
  const statusCode = response.status
  const isFromCloudflare = isCloudflareResponse(response)
  const isHtml = isHtmlResponse(response)
  let isBlocked = false
  let reason: string | undefined
  let blockReason: CloudflareBlockReason | undefined
  const responseHeaders = extractHeaders(response)
  let bodySnippet: string | undefined

  if (isFromCloudflare) {
    indicators.push('cloudflare-headers')

    if (response.headers.get(CLOUDFLARE_HEADERS.CF_RAY)) {
      indicators.push('cf-ray-header')
    }
    if (response.headers.get(CLOUDFLARE_HEADERS.CF_REQUEST_ID)) {
      indicators.push('cf-request-id-header')
    }
  }

  // If response is HTML but we expected JSON/API response, likely blocked
  if (isHtml && url) {
    indicators.push('html-response-unexpected')
    // This is a strong indicator of Cloudflare blocking for API requests
    isBlocked = true
    reason = 'HTML response instead of expected API response - Possibly blocked by Cloudflare'
    blockReason = 'browser-verification'
  }

  // Check status code
  if (CLOUDFLARE_BLOCK_STATUS_CODES.includes(statusCode as (typeof CLOUDFLARE_BLOCK_STATUS_CODES)[number])) {
    indicators.push(`status-${statusCode}`)
    isBlocked = true

    if (statusCode === 403) {
      reason = 'HTTP 403 Forbidden - Possibly blocked by Cloudflare'
      blockReason = 'unknown'
    } else if (statusCode === 429) {
      reason = 'HTTP 429 Too Many Requests - Rate limited by Cloudflare'
      blockReason = 'rate-limited'
    } else if (statusCode === 503) {
      reason = 'HTTP 503 Service Unavailable - Cloudflare protection mode active'
      blockReason = 'ddos-protection'
    }
  }

  // Always check response body for failed responses or HTML responses
  try {
    const bodyText = await response.text()
    bodySnippet = bodyText.substring(0, 500)

    const bodyIndicators = detectChallengeIndicators(bodyText)
    if (bodyIndicators.length > 0) {
      indicators.push(...bodyIndicators.map((ind) => `body-${ind}`))
      isBlocked = true

      const detectedReason = detectBlockReason(bodyText)
      if (detectedReason) {
        blockReason = detectedReason

        if (detectedReason === 'geo-blocked') {
          reason = 'Geographic restrictions - Service is not available in your country/region'
        } else if (detectedReason === 'rate-limited') {
          reason = 'Rate limited - Too many requests, blocked by Cloudflare'
        } else if (detectedReason === 'ip-blocked') {
          reason = 'IP blocked - Your IP address has been banned by Cloudflare'
        } else if (detectedReason === 'ddos-protection') {
          reason = 'DDoS protection active - Cloudflare is protecting this service'
        } else if (detectedReason === 'browser-verification') {
          reason = 'Browser verification required - Cloudflare verification needed'
        } else {
          reason = `Cloudflare challenge page detected: ${bodyIndicators.join(', ')}`
        }
      } else if (!reason) {
        reason = `Cloudflare challenge page detected: ${bodyIndicators.join(', ')}`
        blockReason = 'unknown'
      }
    } else if (isHtml && !reason) {
      // HTML response but no specific indicators found, still likely blocked
      isBlocked = true
      reason = 'HTML response instead of expected API response - Possibly blocked by Cloudflare'
      blockReason = 'unknown'
    }
  } catch (error) {
    warn(`Failed to read response body for Cloudflare check: ${error}`)
  }

  // If Cloudflare response with non-2xx status, mark as blocked
  if (isFromCloudflare && !isBlocked && statusCode !== 200) {
    isBlocked = true
    reason = `Cloudflare response with status ${statusCode} - Possibly blocked`
    blockReason = 'unknown'
  }

  const result: CloudflareCheckResult = {
    isBlocked,
    reason,
    blockReason,
    indicators,
    statusCode,
    isCloudflareResponse: isFromCloudflare,
    headers: responseHeaders,
    bodySnippet,
  }

  if (isBlocked && url) {
    warn(`Cloudflare blocking detected in response for ${url}:`, result)
  }

  return result
}

/**
 * Check if a service URL is blocked by Cloudflare
 * This is a convenience function specifically for checking service endpoints
 * @param serviceUrl Service URL to check (e.g., Navidrome, Radarr base URL)
 * @param options Check options
 * @returns Cloudflare check result with detailed blocking information
 */
export async function checkServiceBlocked(serviceUrl: string, options: CloudflareCheckOptions = {}): Promise<CloudflareCheckResult> {
  // Use GET method and check body by default for service checks
  const checkOptions: CloudflareCheckOptions = {
    method: 'GET',
    checkBody: true,
    ...options,
  }

  return checkCloudflareBlocked(serviceUrl, checkOptions)
}
