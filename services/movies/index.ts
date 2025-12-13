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
 * Find existing movie in movies list
 * Used to preserve insertedAt timestamp when updating cache
 * Matching rules: maoyanId > tmdbId > name (lowercase, trimmed)
 */
export function findExistingMovie(existingMovies: MergedMovie[], newMovie: MergedMovie): MergedMovie | undefined {
  for (const existing of existingMovies) {
    // Match by maoyanId (if both exist)
    if (newMovie.maoyanId && existing.maoyanId && String(newMovie.maoyanId) === String(existing.maoyanId)) {
      return existing
    }

    // Match by tmdbId (if both exist)
    if (newMovie.tmdbId && existing.tmdbId && newMovie.tmdbId === existing.tmdbId) {
      return existing
    }

    // Match by name (case-insensitive, trimmed)
    const newName = newMovie.name.toLowerCase().trim()
    const existingName = existing.name.toLowerCase().trim()
    if (newName && existingName && newName === existingName) {
      return existing
    }
  }

  return undefined
}

/**
 * Get unique identifier for a movie
 * Priority: maoyanId > tmdbId > name (lowercase, trimmed)
 * @param movie Movie object
 * @returns Unique identifier string
 */
export function getMovieId(movie: MergedMovie): string {
  if (movie.maoyanId !== undefined && movie.maoyanId !== null) {
    return `maoyan:${String(movie.maoyanId)}`
  }
  if (movie.tmdbId !== undefined && movie.tmdbId !== null) {
    return `tmdb:${movie.tmdbId}`
  }
  return `name:${movie.name.toLowerCase().trim()}`
}

/**
 * Get movie year from movie data
 * Priority: year field > releaseDate parsing
 * @param movie Movie object
 * @returns Movie year as number, or null if not available
 */
export function getMovieYear(movie: MergedMovie): number | null {
  // Check year field first (most reliable)
  if (movie.year !== undefined && movie.year !== null) {
    const year = typeof movie.year === 'number' ? movie.year : parseInt(String(movie.year), 10)
    if (!isNaN(year)) {
      return year
    }
  }

  // Fallback to releaseDate if year is not available
  if (movie.releaseDate) {
    try {
      const releaseDate = new Date(movie.releaseDate)
      if (!isNaN(releaseDate.getTime())) {
        return releaseDate.getFullYear()
      }
    } catch (error) {
      // Invalid date format
    }
  }

  return null
}

/**
 * Check if a movie is released in the current year or later
 * @param movie Movie object
 * @param targetYear Optional target year (defaults to current year)
 * @returns Object with isValid (boolean) and year (number | null)
 */
export function isMovieFromYearOrLater(movie: MergedMovie, targetYear?: number): { isValid: boolean; year: number | null } {
  const currentYear = targetYear ?? new Date().getFullYear()
  const movieYear = getMovieYear(movie)

  if (movieYear === null) {
    return { isValid: false, year: null }
  }

  return {
    isValid: movieYear >= currentYear,
    year: movieYear,
  }
}

/**
 * Filter movies to only include those released in the current year or later
 * @param movies Array of movies to filter
 * @param targetYear Optional target year (defaults to current year)
 * @returns Filtered array of movies
 */
export function filterMoviesByCurrentYear(movies: MergedMovie[], targetYear?: number): MergedMovie[] {
  return movies.filter((movie) => {
    const { isValid } = isMovieFromYearOrLater(movie, targetYear)
    return isValid
  })
}

/**
 * Get unnotified movies from cache data
 * Filters out movies that have already been notified
 * @param cacheData Movies cache data from GIST
 * @returns Array of unnotified movies, or empty array if no unnotified movies or invalid cache data
 */
export function getUnnotifiedMovies(cacheData: MoviesCacheData | null): MergedMovie[] {
  if (!cacheData || !cacheData.data || !cacheData.data.movies) {
    return []
  }

  const notifiedIds = new Set(cacheData.notifiedMovieIds || [])
  return cacheData.data.movies.filter((movie) => {
    const movieId = getMovieId(movie)
    return !notifiedIds.has(movieId)
  })
}

/**
 * Mark movies as notified and update cache data
 * @param cacheData Current cache data
 * @param movies Movies to mark as notified
 * @returns Updated cache data with notified movie IDs added
 */
export function markMoviesAsNotified(cacheData: MoviesCacheData, movies: MergedMovie[]): MoviesCacheData {
  const notifiedIds = new Set(cacheData.notifiedMovieIds || [])

  // Add movie IDs to notified set
  for (const movie of movies) {
    const movieId = getMovieId(movie)
    notifiedIds.add(movieId)
  }

  // Clean up: remove IDs that are no longer in the movies list
  // This prevents notifiedMovieIds from growing indefinitely
  const currentMovieIds = new Set(cacheData.data.movies.map((movie) => getMovieId(movie)))
  const cleanedNotifiedIds = Array.from(notifiedIds).filter((id) => currentMovieIds.has(id))

  return {
    ...cacheData,
    notifiedMovieIds: cleanedNotifiedIds,
  }
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
    if (cacheData && cacheData.data && cacheData.data.movies) {
      const movies = cacheData.data.movies
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
  const needsUpdate = !cacheData || (cacheData.data.timestamp && shouldUpdate(cacheData.data.timestamp))

  if (cacheData && !needsUpdate) {
    // Use cached data (still fresh)
    const movies = cacheData.data.movies
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
      return cacheData.data.movies
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
      return cacheData.data.movies
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
    cacheData = updateCacheData(cacheData.data, newMovies, cacheData.notifiedMovieIds)
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
  setResultToCache(cacheData.data.movies)

  return cacheData.data.movies
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
    cacheData = updateCacheData(cacheData.data, newMovies, cacheData.notifiedMovieIds)
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
  setResultToCache(cacheData.data.movies)

  return {
    movies: cacheData.data.movies,
    cacheData,
  }
}
