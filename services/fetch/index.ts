import { setHeaders } from '@/services/context'

interface CacheEntry {
  data: ArrayBuffer
  timestamp: number
}

/** Request cache storage */
const cache = new Map<string, CacheEntry>()

/** Ongoing requests collection */
const inProgress = new Map<string, Promise<ArrayBuffer>>()

export interface FetchOptions extends RequestInit {
  /** Cache duration in milliseconds (default is 5 minutes) */
  cacheDuration?: number
}

/**
 * Fetches data from a given URL with caching and error handling
 * @description
 * only use for getting data
 * @param url URL to fetch data from
 * @param options Fetch options
 * @return Promise that resolves to the fetched data
 */
export async function fetchWithCache(url: string, options?: FetchOptions) {
  const { cacheDuration = 5 * 60 * 1000 } = options || {}
  const cacheKey = JSON.stringify({ url, options })

  // If data exists in cache and cache is not expired, return cached data
  if (cache.has(cacheKey)) {
    const { data, timestamp } = cache.get(cacheKey)!
    const isCacheValid = Date.now() - timestamp < cacheDuration

    if (isCacheValid) {
      setHeaders({
        'Hit-Cache': '1',
      })

      return data
    }
  }

  // If the current request is in progress, wait for it to complete
  if (inProgress.has(cacheKey)) {
    // Return the pending Promise
    return Promise.resolve().then(async () => {
      const data = await inProgress.get(cacheKey)!
      return data
    })
  }

  // Create a new request Promise
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, options)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.arrayBuffer()

      // Update cache
      cache.set(cacheKey, { data, timestamp: Date.now() })

      return data
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error)

      // Re-throw error
      throw error
    } finally {
      // Remove the ongoing request after completion
      inProgress.delete(cacheKey)
    }
  })()

  inProgress.set(cacheKey, requestPromise)
  return requestPromise
}
