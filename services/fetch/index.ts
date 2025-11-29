import { setHeaders } from '@/services/context'

import { CACHEABLE_HEADERS, FETCH_CACHE, FETCH_CACHE_SIZE } from './constants'

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export interface FetchOptions extends RequestInit {
  /** Cache duration in milliseconds (default is 5 minutes) */
  cacheDuration?: number
}

/** Request cache storage */
const cache = new Map<string, CacheEntry<ArrayBuffer>>()

/** Ongoing requests collection */
const inProgress = new Map<string, Promise<ArrayBuffer>>()

/**
 * Fetches data from a given URL with caching and error handling
 * @description
 * - Only use for getting data
 * - Uses in-memory cache that works within a single Vercel Serverless Function instance
 * - Cache is effective for warm instances (reused instances)
 * - Cache is empty on cold starts (new instances)
 * - Includes request deduplication to prevent concurrent duplicate requests
 * @param url URL to fetch data from
 * @param options Fetch options
 * @return Promise that resolves to the fetched data
 */
export async function fetchWithCache(url: string, options?: FetchOptions) {
  const { cacheDuration = FETCH_CACHE.DEFAULT_DURATION, ...fetchOptions } = options || {}
  const cacheKey = generateCacheKey(url, fetchOptions)
  const now = Date.now()

  // Maintain cache size and remove expired entries
  if (cache.size >= FETCH_CACHE_SIZE.CLEANUP_THRESHOLD) {
    maintainCache(cache, cacheDuration)
  }

  // Check cache
  const cached = cache.get(cacheKey)
  if (cached) {
    const isCacheValid = now - cached.timestamp < cacheDuration
    if (isCacheValid) {
      setHeaders({
        'Hit-Cache': '1',
      })
      return cached.data
    }
    // Remove expired entry
    cache.delete(cacheKey)
  }

  // Check if request is in progress
  const existingRequest = inProgress.get(cacheKey)
  if (existingRequest) {
    return existingRequest
  }

  // Create new request
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, fetchOptions)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.arrayBuffer()

      // Only cache successful responses
      const entry: CacheEntry<ArrayBuffer> = {
        data,
        timestamp: now,
      }
      cache.set(cacheKey, entry)

      // Maintain cache size after adding new entry
      if (cache.size > FETCH_CACHE_SIZE.MAX_SIZE) {
        evictOldestEntries(cache, FETCH_CACHE_SIZE.MAX_SIZE)
      }

      return data
    } catch (error) {
      // Don't cache errors
      throw error
    } finally {
      // Always remove from in-progress map
      inProgress.delete(cacheKey)
    }
  })()

  inProgress.set(cacheKey, requestPromise)
  return requestPromise
}

/**
 * Fetches JSON data from a given URL with caching and error handling
 * @description
 * - Only use for getting JSON data
 * - Uses in-memory cache that works within a single Vercel Serverless Function instance
 * - Cache is effective for warm instances (reused instances)
 * - Cache is empty on cold starts (new instances)
 * - Includes request deduplication to prevent concurrent duplicate requests
 * - Internally uses fetchWithCache and converts ArrayBuffer to JSON
 * @param url URL to fetch data from
 * @param options Fetch options
 * @return Promise that resolves to the fetched JSON data
 */
export async function fetchJsonWithCache<T = unknown>(url: string, options?: FetchOptions): Promise<T> {
  // Use fetchWithCache to get ArrayBuffer, then convert to JSON
  const buffer = await fetchWithCache(url, options)
  return arrayBufferToJson<T>(buffer)
}

/**
 * Convert ArrayBuffer to JSON
 */
function arrayBufferToJson<T>(buffer: ArrayBuffer): T {
  const decoder = new TextDecoder('utf-8')
  const text = decoder.decode(buffer)
  return JSON.parse(text) as T
}

/**
 * Generate a stable cache key from URL and options
 */
function generateCacheKey(url: string, options?: RequestInit): string {
  // For better performance, only include relevant options
  const relevantOptions: Record<string, unknown> = {
    method: options?.method || 'GET',
  }

  // Include headers if they affect the response
  if (options?.headers) {
    const headers = options.headers as Record<string, string>
    // Only include headers that might affect caching
    for (const [key, value] of Object.entries(headers)) {
      if (CACHEABLE_HEADERS.includes(key.toLowerCase() as (typeof CACHEABLE_HEADERS)[number])) {
        relevantOptions[`header:${key.toLowerCase()}`] = value
      }
    }
  }

  return JSON.stringify({ url, options: relevantOptions })
}

/**
 * Clean expired and excess cache entries
 * This helps prevent memory leaks in long-running instances
 */
function maintainCache<T>(cacheMap: Map<string, CacheEntry<T>>, cacheDuration: number) {
  const now = Date.now()
  let expiredCount = 0

  // Remove expired entries
  for (const [key, entry] of cacheMap.entries()) {
    if (now - entry.timestamp >= cacheDuration) {
      cacheMap.delete(key)
      expiredCount++
    }
  }

  // If cache is still too large after removing expired entries, evict oldest
  if (cacheMap.size > FETCH_CACHE_SIZE.MAX_SIZE) {
    evictOldestEntries(cacheMap, FETCH_CACHE_SIZE.MAX_SIZE)
  }

  // Periodic cleanup when approaching size limit
  if (cacheMap.size >= FETCH_CACHE_SIZE.CLEANUP_THRESHOLD && expiredCount === 0) {
    evictOldestEntries(cacheMap, FETCH_CACHE_SIZE.CLEANUP_THRESHOLD)
  }
}

/**
 * Remove oldest cache entries to maintain size limit
 * Uses LRU-like strategy (removes oldest entries)
 */
function evictOldestEntries<T>(cacheMap: Map<string, CacheEntry<T>>, targetSize: number) {
  if (cacheMap.size <= targetSize) {
    return
  }

  const entries = Array.from(cacheMap.entries())
  // Sort by timestamp (oldest first)
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

  const toRemove = entries.slice(0, cacheMap.size - targetSize)
  for (const [key] of toRemove) {
    cacheMap.delete(key)
  }
}
