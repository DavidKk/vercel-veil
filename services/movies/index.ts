import { fail, info } from '@/services/logger'
import type { GetMergedMoviesListOptions } from '@/services/maoyan'
import { getMergedMoviesListWithoutCache } from '@/services/maoyan'
import type { MergedMovie } from '@/services/maoyan/types'

import { createInitialCacheData, getMoviesFromGist, saveMoviesToGist, setResultToCache, updateCacheData } from './cache'
import type { MoviesCacheData } from './types'

// Re-export types
export {
  createInitialCacheData,
  getMoviesFromGist,
  getResultFromCache,
  processMoviesWithInsertTime,
  saveMoviesToGist,
  setResultToCache,
  shouldUpdate,
  sortMoviesByInsertTime,
  updateCacheData,
} from './cache'
export type { MoviesCacheData } from './types'

/**
 * Find existing movie in previous movies list
 * Matching rules: maoyanId > tmdbId > name (lowercase, trimmed)
 */
export function findExistingMovie(previousMovies: MergedMovie[], newMovie: MergedMovie): MergedMovie | undefined {
  for (const previous of previousMovies) {
    // Match by maoyanId (if both exist)
    if (newMovie.maoyanId && previous.maoyanId && String(newMovie.maoyanId) === String(previous.maoyanId)) {
      return previous
    }

    // Match by tmdbId (if both exist)
    if (newMovie.tmdbId && previous.tmdbId && newMovie.tmdbId === previous.tmdbId) {
      return previous
    }

    // Match by name (case-insensitive, trimmed)
    const newName = newMovie.name.toLowerCase().trim()
    const prevName = previous.name.toLowerCase().trim()
    if (newName && prevName && newName === prevName) {
      return previous
    }
  }

  return undefined
}

/**
 * Get new movies by comparing current and previous lists
 * A movie is considered "new" if it doesn't exist in the previous list
 */
export function getNewMovies(currentMovies: MergedMovie[], previousMovies: MergedMovie[]): MergedMovie[] {
  return currentMovies.filter((movie) => {
    const existing = findExistingMovie(previousMovies, movie)
    // New movie if not found in previous list
    return !existing
  })
}

/**
 * Get new movies from cache data
 * @param cacheData Movies cache data from GIST
 * @returns Array of new movies, or empty array if no new movies or invalid cache data
 */
export function getNewMoviesFromCache(cacheData: MoviesCacheData | null): MergedMovie[] {
  if (!cacheData) {
    return []
  }

  // Check if previous movies list exists and is not empty
  if (!cacheData.previous.movies || cacheData.previous.movies.length === 0) {
    return []
  }

  // Get new movies by comparing current and previous
  return getNewMovies(cacheData.current.movies, cacheData.previous.movies)
}

/**
 * Update movies GIST cache
 * Fetches new movies data and updates GIST cache
 * This function is designed to be called by cron jobs
 * @param options Options for fetching movies
 * @returns Updated movies list and cache data
 * @throws Error if update fails
 */
export async function updateMoviesGist(options: GetMergedMoviesListOptions = {}): Promise<{
  movies: MergedMovie[]
  cacheData: MoviesCacheData
}> {
  info('updateMoviesGist - Starting GIST update')

  // Fetch new movies data
  const newMovies = await getMergedMoviesListWithoutCache(options)

  // Read existing cache data
  let cacheData: MoviesCacheData | null = null
  try {
    cacheData = await getMoviesFromGist()
  } catch (error) {
    // If GIST read fails, create new cache
    info('updateMoviesGist - GIST read failed, creating new cache:', error)
  }

  // Create or update cache data
  if (!cacheData) {
    // First time: create initial cache
    cacheData = createInitialCacheData(newMovies)
    info('updateMoviesGist - Created initial cache data')
  } else {
    // Update existing cache
    cacheData = updateCacheData(cacheData.current, newMovies)
    info('updateMoviesGist - Updated existing cache data')
  }

  // Save to GIST
  try {
    await saveMoviesToGist(cacheData)
    info('updateMoviesGist - Successfully saved to GIST')
  } catch (error) {
    fail('updateMoviesGist - Failed to save to GIST:', error)
    throw error
  }

  // Clear result cache to force refresh on next read
  // Note: We don't have a clearCache function, but setting new cache will work
  setResultToCache(cacheData.current.movies)

  return {
    movies: cacheData.current.movies,
    cacheData,
  }
}
