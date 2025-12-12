import type { GetMergedAnimeListOptions } from '@/services/anilist'
import { getMergedAnimeListWithoutCache } from '@/services/anilist'
import type { Anime } from '@/services/anilist/types'
import { fail, info, warn } from '@/services/logger'

import { createInitialCacheData, getAnimeFromGist, getResultFromCache, saveAnimeToGist, setResultToCache, shouldUpdate, updateCacheData } from './cache'
import type { AnimeCacheData } from './types'

// Re-export types
export {
  createInitialCacheData,
  getAnimeFromGist,
  getResultFromCache,
  processAnimeWithInsertTime,
  saveAnimeToGist,
  setResultToCache,
  shouldUpdate,
  sortAnimeByInsertTime,
  updateCacheData,
} from './cache'
export type { AnimeCacheData } from './types'

/**
 * Find existing anime in previous anime list
 * Matching rules: anilistId > title (romaji, lowercase, trimmed)
 */
export function findExistingAnime(previousAnime: Anime[], newAnime: Anime): Anime | undefined {
  for (const previous of previousAnime) {
    // Match by anilistId (primary match)
    if (newAnime.anilistId && previous.anilistId && newAnime.anilistId === previous.anilistId) {
      return previous
    }

    // Match by title (romaji, case-insensitive, trimmed)
    const newTitle = newAnime.title.romaji.toLowerCase().trim()
    const prevTitle = previous.title.romaji.toLowerCase().trim()
    if (newTitle && prevTitle && newTitle === prevTitle) {
      return previous
    }
  }

  return undefined
}

/**
 * Get new anime by comparing current and previous lists
 * An anime is considered "new" if it doesn't exist in the previous list
 */
export function getNewAnime(currentAnime: Anime[], previousAnime: Anime[]): Anime[] {
  return currentAnime.filter((anime) => {
    const existing = findExistingAnime(previousAnime, anime)

    // New anime if not found in previous list
    return !existing
  })
}

/**
 * Get new anime from cache data
 * @param cacheData Anime cache data from GIST
 * @returns Array of new anime, or empty array if no new anime or invalid cache data
 */
export function getNewAnimeFromCache(cacheData: AnimeCacheData | null): Anime[] {
  if (!cacheData) {
    return []
  }

  // Check if previous anime list exists and is not empty
  if (!cacheData.previous.anime || cacheData.previous.anime.length === 0) {
    return []
  }

  // Get new anime by comparing current and previous
  return getNewAnime(cacheData.current.anime, cacheData.previous.anime)
}

/**
 * Get anime list from cache only (read-only, no update)
 * This function only reads from cache, never triggers updates or external API calls
 * - Checks in-memory cache first
 * - Reads from GIST if available
 * - Returns cached data or empty array if cache not available
 * This function is designed for detail pages to avoid triggering unnecessary updates
 * @returns Anime list from cache, or empty array if cache not available
 */
export async function getAnimeListFromCache(): Promise<Anime[]> {
  // Check in-memory cache first
  const cachedResult = getResultFromCache()
  if (cachedResult) {
    info('getAnimeListFromCache - In-memory cache hit')
    return cachedResult
  }

  // Read from GIST (read-only, no update check)
  try {
    const cacheData = await getAnimeFromGist()
    if (cacheData && cacheData.current.anime) {
      // Update in-memory cache for next time
      setResultToCache(cacheData.current.anime)
      info('getAnimeListFromCache - GIST cache hit')
      return cacheData.current.anime
    }
  } catch (error) {
    // GIST read failure - return empty array (graceful degradation)
    info('getAnimeListFromCache - GIST read failed:', error)
  }

  // No cache available
  return []
}

/**
 * Get anime list with automatic GIST cache management
 * This function handles both reading and writing to GIST automatically
 * - Checks in-memory cache first
 * - Reads from GIST if available
 * - Updates GIST if cache is stale or missing
 * - Returns cached or fresh data
 * This function can be called by both pages and cron jobs
 * @param options Options for fetching anime
 * @returns Anime list
 */
export async function getAnimeListWithAutoUpdate(options: GetMergedAnimeListOptions = {}): Promise<Anime[]> {
  // Check in-memory cache first
  const cachedResult = getResultFromCache()
  if (cachedResult) {
    info('getAnimeListWithAutoUpdate - In-memory cache hit')
    return cachedResult
  }

  // Read from GIST
  let cacheData: AnimeCacheData | null = null
  try {
    cacheData = await getAnimeFromGist()
  } catch (error) {
    // GIST read failure - will update GIST below
    info('getAnimeListWithAutoUpdate - GIST read failed, will create new cache:', error)
  }

  // Check if update is needed
  const needsUpdate = !cacheData || (cacheData.current.timestamp && shouldUpdate(cacheData.current.timestamp))

  if (cacheData && !needsUpdate) {
    // Use cached data (still fresh)
    const anime = cacheData.current.anime
    setResultToCache(anime)
    info('getAnimeListWithAutoUpdate - GIST cache hit (fresh)')
    return anime
  }

  // Need to update: fetch new data and save to GIST
  info('getAnimeListWithAutoUpdate - Updating GIST cache')
  let newAnime: Anime[]
  try {
    newAnime = await getMergedAnimeListWithoutCache(options)
  } catch (error) {
    // If fetch fails, don't cache error - return cached data if available, otherwise throw
    fail('getAnimeListWithAutoUpdate - Failed to fetch anime data:', error)
    if (cacheData) {
      // Return existing cached data instead of failing
      warn('getAnimeListWithAutoUpdate - Using stale cache due to fetch failure')
      return cacheData.current.anime
    }
    // No cache available, throw error
    throw error
  }

  // Validate that we got some data (don't cache empty results if all requests failed)
  if (newAnime.length === 0) {
    warn('getAnimeListWithAutoUpdate - Fetched empty anime list, not caching')
    // Return existing cached data if available
    if (cacheData) {
      warn('getAnimeListWithAutoUpdate - Using stale cache due to empty fetch result')
      return cacheData.current.anime
    }
    // No cache available, return empty array (but don't cache it)
    return []
  }

  // Create or update cache data
  if (!cacheData) {
    // First time: create initial cache
    cacheData = createInitialCacheData(newAnime)
    info('getAnimeListWithAutoUpdate - Created initial cache data')
  } else {
    // Update existing cache
    cacheData = updateCacheData(cacheData.current, newAnime)
    info('getAnimeListWithAutoUpdate - Updated existing cache data')
  }

  // Save to GIST (non-blocking - log errors but don't throw)
  try {
    await saveAnimeToGist(cacheData)
    info('getAnimeListWithAutoUpdate - Successfully saved to GIST')
  } catch (error) {
    // Log error but don't throw - return data anyway
    fail('getAnimeListWithAutoUpdate - Failed to save to GIST (non-blocking):', error)
  }

  // Only cache successful results with data
  setResultToCache(cacheData.current.anime)

  return cacheData.current.anime
}

/**
 * Update anime GIST cache
 * Fetches new anime data and updates GIST cache
 * This function is designed to be called by cron jobs
 * @param options Options for fetching anime
 * @returns Updated anime list and cache data
 * @throws Error if update fails
 */
export async function updateAnimeGist(options: GetMergedAnimeListOptions = {}): Promise<{
  anime: Anime[]
  cacheData: AnimeCacheData
}> {
  info('updateAnimeGist - Starting GIST update')

  // Fetch new anime data
  let newAnime: Anime[]
  try {
    newAnime = await getMergedAnimeListWithoutCache(options)
  } catch (error) {
    // Don't cache errors - throw immediately
    fail('updateAnimeGist - Failed to fetch anime data:', error)
    throw error
  }

  // Validate that we got some data (don't cache empty results if all requests failed)
  if (newAnime.length === 0) {
    const errorMsg = 'updateAnimeGist - Fetched empty anime list, cannot update cache'
    warn(errorMsg)
    throw new Error(errorMsg)
  }

  // Read existing cache data
  let cacheData: AnimeCacheData | null = null
  try {
    cacheData = await getAnimeFromGist()
  } catch (error) {
    // If GIST read fails, create new cache
    info('updateAnimeGist - GIST read failed, creating new cache:', error)
  }

  // Create or update cache data
  if (!cacheData) {
    // First time: create initial cache
    cacheData = createInitialCacheData(newAnime)
    info('updateAnimeGist - Created initial cache data')
  } else {
    // Update existing cache
    cacheData = updateCacheData(cacheData.current, newAnime)
    info('updateAnimeGist - Updated existing cache data')
  }

  // Save to GIST
  try {
    await saveAnimeToGist(cacheData)
    info('updateAnimeGist - Successfully saved to GIST')
  } catch (error) {
    fail('updateAnimeGist - Failed to save to GIST:', error)
    throw error
  }

  // Only cache successful results with data
  setResultToCache(cacheData.current.anime)

  return {
    anime: cacheData.current.anime,
    cacheData,
  }
}
