import { debug, fail, info } from '@/services/logger'
import { parseCustomHeaders } from '@/utils/headers'

import { NAVIDROME, NAVIDROME_CACHE } from './constants'
import { hashToken } from './token'
import { isNavidromeResponse, type NavidromeResponse } from './types'

// Simple in-memory cache for Navidrome requests
const cache = new Map<string, { data: NavidromeResponse; timestamp: number; ttl: number }>()

export interface RequestOptions {
  /** Whether to enable cache, default true */
  useCache?: boolean
  /** Cache TTL in seconds, default from NAVIDROME_CACHE.DEFAULT_TTL */
  cacheTtl?: number
}

function getServerInfo() {
  const NAVIDROME_URL = process.env.NAVIDROME_URL
  const NAVIDROME_USERNAME = process.env.NAVIDROME_USERNAME
  const NAVIDROME_PASSWORD = process.env.NAVIDROME_PASSWORD

  if (!NAVIDROME_URL) {
    throw new Error('NAVIDROME_URL is not set')
  }

  if (!NAVIDROME_USERNAME) {
    throw new Error('NAVIDROME_USERNAME is not set')
  }

  if (!NAVIDROME_PASSWORD) {
    throw new Error('NAVIDROME_PASSWORD is not set')
  }

  const baseUrl = NAVIDROME_URL.trim().replace(/\/$/, '')
  const username = NAVIDROME_USERNAME.trim()
  const password = NAVIDROME_PASSWORD.trim()
  const { salt, hashHex } = hashToken(password)

  return { baseUrl, username, salt, hashHex }
}

function getSearchParams(params: Record<string, string>) {
  const { username, salt, hashHex } = getServerInfo()
  return new URLSearchParams({
    ...NAVIDROME.DEFAULT_PARAMS,
    u: username,
    s: salt,
    t: hashHex,
    ...params,
  })
}

/**
 * Generate a hash from custom headers for cache key
 * This ensures different custom header configurations have different cache entries
 */
function hashCustomHeaders(customHeaders: Record<string, string>): string {
  if (Object.keys(customHeaders).length === 0) {
    return ''
  }

  // Sort headers by key and create a stable hash
  const sortedEntries = Object.entries(customHeaders)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join('|')

  // Simple hash function (not cryptographically secure, but sufficient for cache keys)
  let hash = 0
  for (let i = 0; i < sortedEntries.length; i++) {
    const char = sortedEntries.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return hash.toString(36)
}

function generateCacheKey(path: string, params: Record<string, string>, customHeaders: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const headersHash = hashCustomHeaders(customHeaders)
  const headersSuffix = headersHash ? `|h:${headersHash}` : ''

  return `${path}?${sortedParams}${headersSuffix}`
}

export async function request(path: string, params: Record<string, string> = {}, init: RequestInit = {}, options: RequestOptions = {}): Promise<NavidromeResponse> {
  const CACHE = process.env.CACHE !== '0'

  // Check if cache is enabled
  const isGetRequest = (init.method || 'GET').toUpperCase() === 'GET'
  const { useCache: shouldCache = CACHE && isGetRequest, cacheTtl = NAVIDROME_CACHE.DEFAULT_TTL } = options

  // Parse custom headers from environment variable (needed for cache key)
  const customHeaders = parseCustomHeaders(process.env.NAVIDROME_CUSTOM_HEADERS)

  // Check cache before making request
  if (shouldCache) {
    const cacheKey = generateCacheKey(path, params, customHeaders)
    const cached = cache.get(cacheKey)

    if (cached && Date.now() - cached.timestamp < cached.ttl * 1000) {
      debug(`Cache hit for Navidrome request: ${path}`)
      return cached.data
    }
  }

  const { baseUrl } = getServerInfo()
  const search = getSearchParams(params)
  const url = `${baseUrl}/${path.trim().replace(/^\/+|\/+$/g, '')}?${search.toString()}`

  debug(`Navidrome API request: ${path}`, { params })

  // Log custom headers info (using info instead of debug for Vercel production visibility)
  if (Object.keys(customHeaders).length > 0) {
    info(`Navidrome custom headers parsed:`, customHeaders)
  } else if (process.env.NAVIDROME_CUSTOM_HEADERS) {
    info(`Navidrome custom headers env var exists but failed to parse:`, process.env.NAVIDROME_CUSTOM_HEADERS)
  } else {
    info(`Navidrome custom headers env var not set`)
  }

  const requestHeaders: HeadersInit = {
    'User-Agent': NAVIDROME.USER_AGENT,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
    ...init.headers,
  }

  // Log all headers except sensitive ones for debugging (using info for Vercel production visibility)
  const headerKeys = Object.keys(requestHeaders)
  info(`Navidrome request headers (${headerKeys.length} total):`, headerKeys)

  let response: Response
  let errorText = ''

  try {
    response = await fetch(url, {
      ...init,
      method: 'GET',
      headers: requestHeaders,
    })
  } catch (error) {
    // Network errors should not be cached
    const errorMsg = error instanceof Error ? error.message : 'Network error'
    fail(`Navidrome API network error: ${errorMsg}`)
    throw new Error(`Navidrome API network error: ${errorMsg}`)
  }

  // Check if response is HTML (unexpected for API)
  const contentType = response.headers.get('content-type') || ''
  const isHtml = contentType.toLowerCase().includes('text/html')

  // Handle failed responses - do not cache failures
  if (!response.ok || response.status > 399 || isHtml) {
    try {
      errorText = await response.text()
    } catch (error) {
      errorText = ''
    }

    // If HTML response, it's suspicious
    if (isHtml) {
      const errorMsg = 'Navidrome API returned HTML page instead of expected JSON response'
      fail(errorMsg, { status: response.status, url, contentType })
      // Do not cache failed requests
      throw new Error(errorMsg)
    }

    // Throw original error
    if (!response.ok) {
      const errorMsg = `Navidrome API request failed: ${response.status} ${response.statusText}`
      fail(errorMsg)
      // Do not cache failed requests
      throw new Error('Navidrome API is not available')
    }

    // Should not reach here, but handle anyway
    fail(`Navidrome API error: ${errorText}`)
    throw new Error(errorText)
  }

  // Parse response data
  let data: NavidromeResponse
  try {
    data = await response.json()
  } catch (error) {
    const errorMsg = 'Navidrome API returned invalid JSON response'
    fail(errorMsg, error)
    // Do not cache failed requests
    throw new Error(errorMsg)
  }

  // Validate response format
  if (!isNavidromeResponse(data)) {
    const errorMsg = 'Navidrome API returned invalid response format'
    fail(errorMsg)
    // Do not cache failed requests
    throw new Error('Navidrome API returned empty response')
  }

  // Check API response status
  const content = data['subsonic-response']
  if (content.status === 'failed') {
    const errorMessage = content.error?.message || 'Unknown Navidrome API error'
    const errorCode = content.error?.code || 'unknown'
    const errorMsg = `Navidrome API error (${errorCode}): ${errorMessage}`
    fail(errorMsg)
    // Do not cache failed requests
    throw new Error(errorMsg)
  }

  // Only cache successful responses
  if (shouldCache) {
    const cacheKey = generateCacheKey(path, params, customHeaders)
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
      ttl: cacheTtl,
    })
    debug(`Navidrome response cached: ${path}`)
  }

  return data
}
