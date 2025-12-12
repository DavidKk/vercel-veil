import { fail, info, warn } from '@/services/logger'
import type { GetMergedMoviesListOptions } from '@/services/maoyan'
import { getMergedMoviesListWithoutCache } from '@/services/maoyan'
import type { MergedMovie } from '@/services/maoyan/types'

import { createInitialCacheData, getMoviesFromGist, getResultFromCache, saveMoviesToGist, setResultToCache, shouldUpdate, updateCacheData } from './cache'
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

// Re-export popularity functions
export { filterHotMovies, isHighlyAnticipated, isHot, isVeryHot, judgeMovieHotStatus, MovieHotStatus } from './popularity'

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
 * Get movies list from cache only (read-only, no update)
 * This function only reads from cache, never triggers updates or TMDB requests
 * - Checks in-memory cache first
 * - Reads from GIST if available
 * - Returns cached data or empty array if cache not available
 * This function is designed for detail pages to avoid triggering unnecessary updates
 * @returns Movies list from cache, or empty array if cache not available
 */
export async function getMoviesListFromCache(): Promise<MergedMovie[]> {
  // Check in-memory cache first
  const cachedResult = getResultFromCache()
  if (cachedResult) {
    info('getMoviesListFromCache - In-memory cache hit')
    return cachedResult
  }

  // Read from GIST (read-only, no update check)
  try {
    const cacheData = await getMoviesFromGist()
    if (cacheData && cacheData.current && cacheData.current.movies) {
      const movies = cacheData.current.movies
      // Update in-memory cache for faster subsequent access
      setResultToCache(movies)
      info('getMoviesListFromCache - GIST cache hit')
      return movies
    }
  } catch (error) {
    // GIST read failure - return empty array (don't trigger update)
    info('getMoviesListFromCache - GIST read failed, returning empty array:', error)
  }

  // No cache available - return empty array (don't trigger update)
  return []
}

/**
 * Get movies list with automatic GIST cache management
 * This function handles both reading and writing to GIST automatically
 * - Checks in-memory cache first
 * - Reads from GIST if available
 * - Updates GIST if cache is stale or missing
 * - Returns cached or fresh data
 * This function can be called by both pages and cron jobs
 * @param options Options for fetching movies
 * @returns Movies list
 */
export async function getMoviesListWithAutoUpdate(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  // Check in-memory cache first
  const cachedResult = getResultFromCache()
  if (cachedResult) {
    info('getMoviesListWithAutoUpdate - In-memory cache hit')
    return cachedResult
  }

  // Read from GIST
  let cacheData: MoviesCacheData | null = null
  try {
    cacheData = await getMoviesFromGist()
  } catch (error) {
    // GIST read failure - will update GIST below
    info('getMoviesListWithAutoUpdate - GIST read failed, will create new cache:', error)
  }

  // Check if update is needed
  const needsUpdate = !cacheData || (cacheData.current.timestamp && shouldUpdate(cacheData.current.timestamp))

  if (cacheData && !needsUpdate) {
    // Use cached data (still fresh)
    const movies = cacheData.current.movies
    setResultToCache(movies)
    info('getMoviesListWithAutoUpdate - GIST cache hit (fresh)')
    return movies
  }

  // Need to update: fetch new data and save to GIST
  info('getMoviesListWithAutoUpdate - Updating GIST cache')
  let newMovies: MergedMovie[]
  try {
    newMovies = await getMergedMoviesListWithoutCache(options)
  } catch (error) {
    // If fetch fails, don't cache error - return cached data if available, otherwise throw
    fail('getMoviesListWithAutoUpdate - Failed to fetch movies data:', error)
    if (cacheData) {
      // Return existing cached data instead of failing
      warn('getMoviesListWithAutoUpdate - Using stale cache due to fetch failure')
      return cacheData.current.movies
    }
    // No cache available, throw error
    throw error
  }

  // Validate that we got some data (don't cache empty results if all requests failed)
  if (newMovies.length === 0) {
    warn('getMoviesListWithAutoUpdate - Fetched empty movies list, not caching')
    // Return existing cached data if available
    if (cacheData) {
      warn('getMoviesListWithAutoUpdate - Using stale cache due to empty fetch result')
      return cacheData.current.movies
    }
    // No cache available, return empty array (but don't cache it)
    return []
  }

  // Create or update cache data
  if (!cacheData) {
    // First time: create initial cache
    cacheData = createInitialCacheData(newMovies)
    info('getMoviesListWithAutoUpdate - Created initial cache data')
  } else {
    // Update existing cache
    cacheData = updateCacheData(cacheData.current, newMovies)
    info('getMoviesListWithAutoUpdate - Updated existing cache data')
  }

  // Save to GIST (non-blocking - log errors but don't throw)
  try {
    await saveMoviesToGist(cacheData)
    info('getMoviesListWithAutoUpdate - Successfully saved to GIST')
  } catch (error) {
    // Log error but don't throw - return data anyway
    fail('getMoviesListWithAutoUpdate - Failed to save to GIST (non-blocking):', error)
  }

  // Only cache successful results with data
  setResultToCache(cacheData.current.movies)

  return cacheData.current.movies
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
  let newMovies: MergedMovie[]
  try {
    newMovies = await getMergedMoviesListWithoutCache(options)
  } catch (error) {
    // Don't cache errors - throw immediately
    fail('updateMoviesGist - Failed to fetch movies data:', error)
    throw error
  }

  // Validate that we got some data (don't cache empty results if all requests failed)
  if (newMovies.length === 0) {
    const errorMsg = 'updateMoviesGist - Fetched empty movies list, cannot update cache'
    warn(errorMsg)
    throw new Error(errorMsg)
  }

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

  // Only cache successful results with data
  setResultToCache(cacheData.current.movies)

  return {
    movies: cacheData.current.movies,
    cacheData,
  }
}
