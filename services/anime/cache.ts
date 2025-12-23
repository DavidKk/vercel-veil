import type { Anime } from '@/services/anilist/types'
import { getGistInfo, readGistFile, writeGistFile, writeGistFiles } from '@/services/gist'
import { info, warn } from '@/services/logger'

import { DATA_VALIDITY_DURATION, GIST_FILE_NAME, RESULT_CACHE_KEY, UPDATE_WINDOW_DURATION, UPDATE_WINDOWS } from './constants'
import { findExistingAnime } from './index'
import type { AnimeCacheData } from './types'

/**
 * Result cache storage (in-memory, similar to fetchWithCache)
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const resultCache = new Map<string, CacheEntry<Anime[]>>()

/**
 * Get UTC date string (YYYY-MM-DD)
 */
function getUtcDateString(date: Date = new Date()): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the update window index for a given timestamp
 * @param timestamp UTC timestamp
 * @returns Update window index (0, 1, or 2) or null if not in any window
 */
function getUpdateWindowIndex(timestamp: number): number | null {
  const date = new Date(timestamp)
  const utcHour = date.getUTCHours()

  for (let i = 0; i < UPDATE_WINDOWS.length; i++) {
    const window = UPDATE_WINDOWS[i]
    if (utcHour >= window && utcHour < window + UPDATE_WINDOW_DURATION) {
      return i
    }
  }

  return null
}

/**
 * Check if data should be updated
 * @param currentTimestamp Current data timestamp (from GIST)
 * @returns true if data should be updated
 */
export function shouldUpdate(currentTimestamp: number): boolean {
  const now = Date.now()
  const age = now - currentTimestamp

  // If data is older than validity duration (8 hours), always update
  if (age >= DATA_VALIDITY_DURATION) {
    return true
  }

  // Get update window for data timestamp and current time
  const dataWindow = getUpdateWindowIndex(currentTimestamp)
  const currentWindow = getUpdateWindowIndex(now)

  // If both are in update windows, check if they're in the same window
  if (dataWindow !== null && currentWindow !== null) {
    // If in different windows, need to update
    // If in same window, no need to update
    return dataWindow !== currentWindow
  }

  // If current time is in update window but data was not, need to update
  if (currentWindow !== null && dataWindow === null) {
    return true
  }

  // If current time is not in update window, no need to update
  return false
}

/**
 * Read anime cache from GIST
 * @returns AnimeCacheData if found and valid, null if file not found, throws on other errors
 */
export async function getAnimeFromGist(): Promise<AnimeCacheData | null> {
  // getGistInfo() throws if env vars not set - let it propagate (configuration error)
  const { gistId, gistToken } = getGistInfo()

  try {
    const content = await readGistFile({
      gistId,
      gistToken,
      fileName: GIST_FILE_NAME,
    })

    // JSON.parse can throw - let it propagate (data corruption)
    const data = JSON.parse(content) as AnimeCacheData

    // Validate data structure
    if (!data.current || !data.previous) {
      warn('Invalid anime cache data structure')
      return null
    }

    info('Anime cache loaded from GIST')
    return data
  } catch (error) {
    // File not found is expected on first run - return null
    if (error instanceof Error && error.message.includes('not found')) {
      info('Anime cache file not found in GIST, will create new one')
      return null
    }
    // All other errors (network, JSON parse, etc.) should propagate
    throw error
  }
}

/**
 * Save anime cache to GIST (atomic operation, idempotent)
 * @throws Error if save fails (caller should handle this for non-blocking operations)
 */
export async function saveAnimeToGist(data: AnimeCacheData): Promise<void> {
  // getGistInfo() throws if env vars not set - let it propagate (configuration error)
  const { gistId, gistToken } = getGistInfo()
  const content = JSON.stringify(data, null, 2)

  // Check file size (GIST has 1MB limit per file)
  const contentSize = new Blob([content]).size
  const maxSize = 1024 * 1024 // 1MB
  if (contentSize > maxSize) {
    warn(`Anime cache content size (${(contentSize / 1024).toFixed(2)}KB) exceeds GIST limit (1MB)`)
    // Try to reduce size by removing previous data if it's too large
    if (data.previous.anime.length > 0) {
      info('Attempting to save with empty previous data to reduce size')
      const reducedData: AnimeCacheData = {
        ...data,
        previous: {
          ...data.previous,
          anime: [],
          metadata: {
            ...data.previous.metadata,
            totalCount: 0,
            description: 'Previous data cleared due to size limit',
          },
        },
      }
      const reducedContent = JSON.stringify(reducedData, null, 2)
      const reducedSize = new Blob([reducedContent]).size
      if (reducedSize > maxSize) {
        throw new Error(`Even with reduced data, size (${(reducedSize / 1024).toFixed(2)}KB) exceeds limit`)
      }
      await writeGistFile({
        gistId,
        gistToken,
        file: GIST_FILE_NAME,
        content: reducedContent,
      })
      info('Anime cache saved to GIST (reduced)')
      return
    }
    throw new Error('Anime cache content too large and cannot be reduced')
  }

  // writeGistFile() throws on failure - let it propagate (caller handles with .catch())
  await writeGistFile({
    gistId,
    gistToken,
    file: GIST_FILE_NAME,
    content,
  })

  info('Anime cache saved to GIST')
}

/**
 * Process anime with insert time
 * - New anime: set insertedAt and updatedAt to current time
 * - Existing anime: preserve insertedAt, update updatedAt
 */
export function processAnimeWithInsertTime(previousAnime: Anime[], newAnime: Anime[]): Anime[] {
  const now = Date.now()

  return newAnime.map((anime) => {
    const existing = findExistingAnime(previousAnime, anime)

    if (existing && existing.insertedAt) {
      // Existing anime: preserve insertedAt, update updatedAt
      return {
        ...anime,
        insertedAt: existing.insertedAt,
        updatedAt: now,
      }
    } else {
      // New anime: set both insertedAt and updatedAt
      return {
        ...anime,
        insertedAt: now,
        updatedAt: now,
      }
    }
  })
}

/**
 * Sort anime by insertedAt (descending, newest first)
 */
export function sortAnimeByInsertTime(anime: Anime[]): Anime[] {
  return [...anime].sort((a, b) => {
    // Anime without insertedAt go to the end
    if (!a.insertedAt && !b.insertedAt) return 0
    if (!a.insertedAt) return 1
    if (!b.insertedAt) return -1

    // Sort by insertedAt descending (newest first)
    return b.insertedAt - a.insertedAt
  })
}

/**
 * Get result from cache
 */
export function getResultFromCache(): Anime[] | null {
  const entry = resultCache.get(RESULT_CACHE_KEY)
  if (!entry) {
    return null
  }

  const now = Date.now()
  const age = now - entry.timestamp

  // Cache is valid for 8 hours (same as data validity)
  if (age >= DATA_VALIDITY_DURATION) {
    resultCache.delete(RESULT_CACHE_KEY)
    return null
  }

  info(`Anime cache hit: ${entry.data.length} anime`)
  return entry.data
}

/**
 * Set result to cache
 */
export function setResultToCache(anime: Anime[]): void {
  resultCache.set(RESULT_CACHE_KEY, {
    data: anime,
    timestamp: Date.now(),
  })
  info(`Anime cache set: ${anime.length} anime`)
}

/**
 * Clear result cache (in-memory only)
 */
export function clearResultCache(): void {
  resultCache.delete(RESULT_CACHE_KEY)
  info('Anime result cache cleared')
}

/**
 * Delete anime cache from GIST
 * This will force a fresh data fetch on the next request
 * If file doesn't exist, returns successfully (no-op)
 */
export async function deleteAnimeFromGist(): Promise<void> {
  const { gistId, gistToken } = getGistInfo()

  // First check if file exists
  try {
    await readGistFile({
      gistId,
      gistToken,
      fileName: GIST_FILE_NAME,
    })
    // File exists, proceed with deletion
  } catch (error) {
    // File not found - that's fine, nothing to delete
    if (error instanceof Error && error.message.includes('not found')) {
      info('Anime cache file not found in GIST, nothing to delete')
      return
    }
    // Other errors (network, auth, etc.) should propagate
    throw error
  }

  // File exists, delete it
  try {
    await writeGistFiles({
      gistId,
      gistToken,
      files: [
        {
          file: GIST_FILE_NAME,
          content: null, // null means delete the file
        },
      ],
    })
    info('Anime cache deleted from GIST')
  } catch (error) {
    // If deletion fails because file doesn't exist (race condition), that's OK
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('404'))) {
      info('Anime cache file was already deleted or not found')
      return
    }
    // Other errors should propagate
    throw error
  }
}

/**
 * Create initial cache data structure
 */
export function createInitialCacheData(anime: Anime[]): AnimeCacheData {
  const now = Date.now()
  const date = getUtcDateString()

  const processedAnime = processAnimeWithInsertTime([], anime)
  const sortedAnime = sortAnimeByInsertTime(processedAnime)

  return {
    current: {
      date,
      timestamp: now,
      anime: sortedAnime,
      metadata: {
        totalCount: sortedAnime.length,
        description: `Anime cache created at ${new Date(now).toISOString()}`,
      },
    },
    previous: {
      date,
      timestamp: now,
      anime: [],
      metadata: {
        totalCount: 0,
        description: 'Initial previous data (empty)',
      },
    },
  }
}

/**
 * Update cache data with new anime
 */
export function updateCacheData(current: AnimeCacheData['current'], newAnime: Anime[]): AnimeCacheData {
  const now = Date.now()
  const date = getUtcDateString()

  // Process anime with insert time (using current.anime as previous)
  const processedAnime = processAnimeWithInsertTime(current.anime, newAnime)
  const sortedAnime = sortAnimeByInsertTime(processedAnime)

  // Count new anime
  const newAnimeCount = sortedAnime.filter((a) => {
    const existing = findExistingAnime(current.anime, a)
    return !existing || !existing.insertedAt
  }).length

  return {
    current: {
      date,
      timestamp: now,
      anime: sortedAnime,
      metadata: {
        totalCount: sortedAnime.length,
        description: `Anime cache updated at ${new Date(now).toISOString()}, ${newAnimeCount} new anime`,
      },
    },
    previous: {
      ...current,
    },
  }
}
