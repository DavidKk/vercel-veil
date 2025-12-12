import { checkResponseForCloudflareBlocking } from '@/services/cloudflare'
import { debug, fail } from '@/services/logger'
import { parseCustomHeaders } from '@/utils/headers'

import { RADARR } from './constants'
import type { RadarrError } from './types'

function getServerInfo() {
  const RADARR_URL = process.env.RADARR_URL
  const RADARR_API_KEY = process.env.RADARR_API_KEY

  if (!RADARR_URL) {
    throw new Error('RADARR_URL is not set')
  }

  if (!RADARR_API_KEY) {
    throw new Error('RADARR_API_KEY is not set')
  }

  const baseUrl = RADARR_URL.trim().replace(/\/$/, '')
  const apiKey = RADARR_API_KEY.trim()

  return { baseUrl, apiKey }
}

function getHeaders(customHeaders?: Record<string, string>): HeadersInit {
  const { apiKey } = getServerInfo()

  // Parse custom headers from environment variable
  const envCustomHeaders = parseCustomHeaders(process.env.RADARR_CUSTOM_HEADERS)

  const headers: HeadersInit = {
    ...RADARR.DEFAULT_HEADERS,
    'X-Api-Key': apiKey,
    ...envCustomHeaders,
    ...customHeaders,
  }

  return headers
}

/**
 * Make a request to Radarr API
 * @param path API path (e.g., 'movie' or 'movie/123')
 * @param init Fetch request options
 * @param customHeaders Custom headers to add to the request
 * @returns Radarr API response
 */
export async function request<T = any>(path: string, init: RequestInit = {}, customHeaders?: Record<string, string>): Promise<T> {
  const { baseUrl } = getServerInfo()
  // Clean path but preserve query string if present
  // Split path and query string to handle them separately
  const [pathPart, queryString] = path.trim().split('?')
  const cleanPath = pathPart.replace(/^\/+/, '').replace(/\/+$/, '')
  const url = queryString ? `${baseUrl}/api/${RADARR.API_VERSION}/${cleanPath}?${queryString}` : `${baseUrl}/api/${RADARR.API_VERSION}/${cleanPath}`

  const headers = getHeaders(customHeaders)
  const method = init.method || 'GET'

  debug(`Radarr API request: ${method} ${path}`, { url, method })

  const response = await fetch(url, {
    ...init,
    method,
    headers: {
      ...headers,
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
      const errorMsg = `Radarr API blocked by Cloudflare: ${cloudflareCheck.reason || 'Unknown reason'}`
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
      const errorMsg = 'Radarr API returned HTML page instead of expected JSON response - Possibly blocked by Cloudflare'
      fail(errorMsg, { status: response.status, url, contentType })
      throw new Error(errorMsg)
    }

    // Not Cloudflare blocking, parse and throw original error
    if (!response.ok) {
      let errorMessage = `Radarr API request failed: ${response.status} ${response.statusText}`

      try {
        const errorData = JSON.parse(errorText) as RadarrError | RadarrError[]
        if (Array.isArray(errorData)) {
          const messages = errorData.map((e) => e.errorMessage || e.propertyName).filter(Boolean)
          if (messages.length > 0) {
            errorMessage = `Radarr API error: ${messages.join(', ')}`
          }
        } else if (errorData.errorMessage) {
          errorMessage = `Radarr API error: ${errorData.errorMessage}`
        }
      } catch {
        // If parsing fails, use the raw error text
        if (errorText) {
          errorMessage = `Radarr API error: ${errorText}`
        }
      }

      fail(errorMessage)
      throw new Error(errorMessage)
    }
  }

  // Handle 204 No Content (common for DELETE requests)
  if (response.status === 204) {
    return {} as T
  }

  const data = await response.json()
  return data as T
}
