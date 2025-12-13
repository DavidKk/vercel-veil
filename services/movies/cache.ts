import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'
import { info, warn } from '@/services/logger'
import type { MergedMovie } from '@/services/maoyan/types'

import { DATA_VALIDITY_DURATION, GIST_FILE_NAME, RESULT_CACHE_KEY, UPDATE_WINDOW_DURATION, UPDATE_WINDOWS } from './constants'
import { findExistingMovie, getMovieId } from './index'
import type { MoviesCacheData } from './types'

/**
 * Result cache storage (in-memory, similar to fetchWithCache)
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const resultCache = new Map<string, CacheEntry<MergedMovie[]>>()

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
 * Read movies cache from GIST
 * @returns MoviesCacheData if found and valid, null if file not found, throws on other errors
 */
export async function getMoviesFromGist(): Promise<MoviesCacheData | null> {
  // getGistInfo() throws if env vars not set - let it propagate (configuration error)
  const { gistId, gistToken } = getGistInfo()

  try {
    const content = await readGistFile({
      gistId,
      gistToken,
      fileName: GIST_FILE_NAME,
    })

    // JSON.parse can throw - let it propagate (data corruption)
    const data = JSON.parse(content) as MoviesCacheData

    // Validate data structure
    if (!data.data) {
      warn('Invalid movies cache data structure')
      return null
    }

    info('Movies cache loaded from GIST')
    return data
  } catch (error) {
    // File not found is expected on first run - return null
    if (error instanceof Error && error.message.includes('not found')) {
      info('Movies cache file not found in GIST, will create new one')
      return null
    }
    // All other errors (network, JSON parse, etc.) should propagate
    throw error
  }
}

/**
 * Save movies cache to GIST (atomic operation, idempotent)
 * @throws Error if save fails (caller should handle this for non-blocking operations)
 */
export async function saveMoviesToGist(data: MoviesCacheData): Promise<void> {
  // getGistInfo() throws if env vars not set - let it propagate (configuration error)
  const { gistId, gistToken } = getGistInfo()
  const content = JSON.stringify(data, null, 2)

  // Check file size (GIST has 1MB limit per file)
  const contentSize = new Blob([content]).size
  const maxSize = 1024 * 1024 // 1MB
  if (contentSize > maxSize) {
    warn(`Movies cache content size (${(contentSize / 1024).toFixed(2)}KB) exceeds GIST limit (1MB)`)
    throw new Error(`Movies cache content too large (${(contentSize / 1024).toFixed(2)}KB) exceeds limit (1MB)`)
  }

  // writeGistFile() throws on failure - let it propagate (caller handles with .catch())
  await writeGistFile({
    gistId,
    gistToken,
    file: GIST_FILE_NAME,
    content,
  })

  info('Movies cache saved to GIST')
}

/**
 * Process movies with insert time
 * - New movies: set insertedAt and updatedAt to current time
 * - Existing movies: preserve insertedAt, update updatedAt
 */
export function processMoviesWithInsertTime(existingMovies: MergedMovie[], newMovies: MergedMovie[]): MergedMovie[] {
  const now = Date.now()

  return newMovies.map((movie) => {
    const existing = findExistingMovie(existingMovies, movie)

    if (existing && existing.insertedAt) {
      // Existing movie: preserve insertedAt, update updatedAt
      return {
        ...movie,
        insertedAt: existing.insertedAt,
        updatedAt: now,
      }
    } else {
      // New movie: set both insertedAt and updatedAt
      return {
        ...movie,
        insertedAt: now,
        updatedAt: now,
      }
    }
  })
}

/**
 * Sort movies by insertedAt (descending, newest first)
 */
export function sortMoviesByInsertTime(movies: MergedMovie[]): MergedMovie[] {
  return [...movies].sort((a, b) => {
    // Movies without insertedAt go to the end
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
export function getResultFromCache(): MergedMovie[] | null {
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

  info(`Movies cache hit: ${entry.data.length} movies`)
  return entry.data
}

/**
 * Set result to cache
 */
export function setResultToCache(movies: MergedMovie[]): void {
  resultCache.set(RESULT_CACHE_KEY, {
    data: movies,
    timestamp: Date.now(),
  })
  info(`Movies cache set: ${movies.length} movies`)
}

/**
 * Create initial cache data structure
 */
export function createInitialCacheData(movies: MergedMovie[]): MoviesCacheData {
  const now = Date.now()
  const date = getUtcDateString()

  const processedMovies = processMoviesWithInsertTime([], movies)
  const sortedMovies = sortMoviesByInsertTime(processedMovies)

  return {
    data: {
      date,
      timestamp: now,
      movies: sortedMovies,
      metadata: {
        totalCount: sortedMovies.length,
        description: `Movies cache created at ${new Date(now).toISOString()}`,
      },
    },
    notifiedMovieIds: [],
  }
}

/**
 * Update cache data with new movies
 */
export function updateCacheData(existing: MoviesCacheData['data'], newMovies: MergedMovie[], previousNotifiedMovieIds: string[] = []): MoviesCacheData {
  const now = Date.now()
  const date = getUtcDateString()

  // Process movies with insert time (using existing.movies to preserve insertedAt)
  const processedMovies = processMoviesWithInsertTime(existing.movies, newMovies)
  const sortedMovies = sortMoviesByInsertTime(processedMovies)

  // Count new movies
  const newMoviesCount = sortedMovies.filter((m) => {
    const existingMovie = findExistingMovie(existing.movies, m)
    return !existingMovie || !existingMovie.insertedAt
  }).length

  // Clean up notifiedMovieIds: only keep IDs that exist in the new movies list
  // This prevents the list from growing indefinitely when movies are removed
  const newMovieIds = new Set(sortedMovies.map((movie) => getMovieId(movie)))
  const cleanedNotifiedMovieIds = previousNotifiedMovieIds.filter((id) => newMovieIds.has(id))

  return {
    data: {
      date,
      timestamp: now,
      movies: sortedMovies,
      metadata: {
        totalCount: sortedMovies.length,
        description: `Movies cache updated at ${new Date(now).toISOString()}, ${newMoviesCount} new movies`,
      },
    },
    // Preserve notified movie IDs from previous cache, but only those that still exist
    notifiedMovieIds: cleanedNotifiedMovieIds,
  }
}
