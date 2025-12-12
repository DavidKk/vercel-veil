import { checkResponseForCloudflareBlocking } from '@/services/cloudflare'
import { debug, fail } from '@/services/logger'

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

function generateCacheKey(path: string, params: Record<string, string>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return `${path}?${sortedParams}`
}

export async function request(path: string, params: Record<string, string> = {}, init: RequestInit = {}, options: RequestOptions = {}): Promise<NavidromeResponse> {
  const CACHE = process.env.CACHE !== '0'

  // Check if cache is enabled
  const isGetRequest = (init.method || 'GET').toUpperCase() === 'GET'
  const { useCache: shouldCache = CACHE && isGetRequest, cacheTtl = NAVIDROME_CACHE.DEFAULT_TTL } = options

  if (shouldCache) {
    const cacheKey = generateCacheKey(path, params)
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

  const response = await fetch(url, {
    ...init,
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...init.headers,
    },
  })

  // Check if response is HTML (unexpected for API) - likely Cloudflare blocking
  const contentType = response.headers.get('content-type') || ''
  const isHtml = contentType.toLowerCase().includes('text/html')

  if (!response.ok || response.status > 399 || isHtml) {
    // Clone response for Cloudflare check (since we need to read body)
    const responseClone = response.clone()
    let errorText: string

    try {
      errorText = await response.text()
    } catch (error) {
      errorText = ''
    }

    // Check if blocked by Cloudflare
    const cloudflareCheck = await checkResponseForCloudflareBlocking(responseClone, url)
    if (cloudflareCheck.isBlocked) {
      const errorMsg = `Navidrome API blocked by Cloudflare: ${cloudflareCheck.reason || 'Unknown reason'}`
      fail(errorMsg, {
        status: response.status,
        blockReason: cloudflareCheck.blockReason,
        indicators: cloudflareCheck.indicators,
        url,
        contentType,
        isHtml,
      })
      throw new Error(errorMsg)
    }

    // If HTML response but not detected as Cloudflare, still suspicious
    if (isHtml) {
      const errorMsg = 'Navidrome API returned HTML page instead of expected JSON response - Possibly blocked by Cloudflare'
      fail(errorMsg, { status: response.status, url, contentType })
      throw new Error(errorMsg)
    }

    // Not Cloudflare blocking, throw original error
    if (!response.ok) {
      fail(`Navidrome API request failed: ${response.status} ${response.statusText}`)
      throw new Error('Navidrome API is not available')
    }

    fail(`Navidrome API error: ${errorText}`)
    throw new Error(errorText)
  }

  const data = await response.json()
  if (!isNavidromeResponse(data)) {
    fail('Navidrome API returned invalid response format')
    throw new Error('Navidrome API returned empty response')
  }

  const content = data['subsonic-response']
  if (content.status === 'failed') {
    const errorMessage = content.error?.message || 'Unknown Navidrome API error'
    const errorCode = content.error?.code || 'unknown'
    fail(`Navidrome API error (${errorCode}): ${errorMessage}`)
    throw new Error(`Navidrome API error (${errorCode}): ${errorMessage}`)
  }

  // Cache successful results
  if (shouldCache) {
    const cacheKey = generateCacheKey(path, params)
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
      ttl: cacheTtl,
    })
  }

  return data
}
