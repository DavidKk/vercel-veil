'use server'

import { validateCookie } from '@/services/auth/access'
import { fail, info, warn } from '@/services/logger'
import { getMergedMoviesList, type GetMergedMoviesListOptions } from '@/services/maoyan'
import type { MergedMovie } from '@/services/maoyan/types'
import { getMoviesFromGist, getResultFromCache, setResultToCache } from '@/services/movies'
import { addToFavorites, getFavoriteMovies } from '@/services/tmdb'
import { hasTmdbAuth } from '@/services/tmdb/env'

/**
 * Get merged movie list (Server Action)
 * Internal use only, requires authentication
 * Underlying API requests are cached at the atomic level (fetchTopRatedMovies, fetchMostExpected)
 * @param options Options for fetching movies
 *   - includeTMDBPopular: Include popular movies from TMDB (default: true)
 *   - includeTMDBUpcoming: Include upcoming movies from TMDB, merged with now playing movies (default: true)
 *     Now playing movies with rating >= 7.0 will be included in upcoming list
 * Note: Only movies with wish data (from Maoyan) will be returned
 */
export type GetMoviesListOptions = GetMergedMoviesListOptions

export async function getMoviesList(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  // Authentication errors should be thrown immediately
  if (!(await validateCookie())) {
    fail('Unauthorized access to movies list')
    throw new Error('Unauthorized')
  }

  // Let errors propagate - they will be logged by Next.js error boundary
  // Only catch if we need to transform the error
  return await getMergedMoviesList(options)
}

/**
 * Get merged movie list with GIST cache (Server Action)
 * Internal use only, requires authentication
 * Uses GIST for persistent storage and result cache for in-memory caching
 * Note: GIST updates are handled by cron job, this function only reads from cache
 * @param options Options for fetching movies (used only for fallback)
 *   - includeTMDBPopular: Include popular movies from TMDB (default: true)
 *   - includeTMDBUpcoming: Include upcoming movies from TMDB, merged with now playing movies (default: true)
 */
export async function getMoviesListWithGistCache(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  // Authentication errors should be thrown immediately
  if (!(await validateCookie())) {
    fail('Unauthorized access to movies list')
    throw new Error('Unauthorized')
  }

  // Check result cache first
  const cachedResult = getResultFromCache()
  if (cachedResult) {
    info('getMoviesListWithGistCache - Cache hit')
    return cachedResult
  }

  // Read from GIST - allow errors to propagate if GIST is critical
  // But catch GIST errors specifically to allow fallback
  let cacheData: Awaited<ReturnType<typeof getMoviesFromGist>> | null = null
  let gistReadFailed = false
  try {
    cacheData = await getMoviesFromGist()
  } catch (error) {
    // GIST read failure - will fallback to getMoviesList if no cache data
    gistReadFailed = true
    warn('getMoviesListWithGistCache - GIST read failed, falling back to API:', error)
  }

  if (cacheData) {
    // Use cached data (GIST updates are handled by cron job)
    const movies = cacheData.current.movies
    setResultToCache(movies)
    info('getMoviesListWithGistCache - GIST cache hit')
    return movies
  }

  // If GIST read failed or no cache data, fallback to getMoviesList
  if (gistReadFailed || !cacheData) {
    warn('getMoviesListWithGistCache - No GIST cache available, falling back to getMoviesList')
    return getMoviesList(options)
  }

  // This should never be reached, but TypeScript needs it
  return getMoviesList(options)
}

/**
 * Add movie to TMDB favorites list (Server Action)
 * Internal use only, requires authentication
 */
export async function favoriteMovie(movieId: number, favorite = true): Promise<{ success: boolean; message: string }> {
  // Authentication errors should return error response (Server Action pattern)
  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to favorite movie')
      return {
        success: false,
        message: 'Unauthorized',
      }
    }
  } catch (error) {
    // If validateCookie throws, return error response
    fail('favoriteMovie - Auth check error:', error)
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  // Catch API errors but log them - these are expected (network issues, API limits, etc.)
  try {
    await addToFavorites(movieId, favorite)

    return {
      success: true,
      message: favorite ? 'Added to favorites' : 'Removed from favorites',
    }
  } catch (error) {
    // Log the full error for debugging
    fail('favoriteMovie - Error:', error)

    // Return user-friendly message, but error details are in logs
    const errorMessage = error instanceof Error ? error.message : 'Operation failed'
    return {
      success: false,
      message: errorMessage,
    }
  }
}

/**
 * Check if favorite feature is available (Server Action)
 * Internal use only, requires authentication
 * Returns false on any error (graceful degradation)
 */
export async function isFavoriteFeatureAvailable(): Promise<boolean> {
  try {
    if (!(await validateCookie())) {
      return false
    }
    return hasTmdbAuth()
  } catch (error) {
    // Return false on any error (auth check failure, etc.)
    fail('isFavoriteFeatureAvailable - Error:', error)
    return false
  }
}

/**
 * Get user's favorite movie IDs (Server Action)
 * Internal use only, requires authentication
 * Returns array instead of Set for serialization
 */
export async function getFavoriteMovieIds(): Promise<number[]> {
  // Authentication check - return empty if not authenticated (expected behavior)
  if (!(await validateCookie())) {
    fail('Unauthorized access to favorite movie IDs')
    return []
  }

  // Feature not available - return empty (expected behavior)
  if (!hasTmdbAuth()) {
    return []
  }

  // Let API errors propagate - they indicate real problems (network, API issues)
  // Only catch if we need to handle gracefully
  try {
    const favoriteIds = await getFavoriteMovies()

    // Convert Set to Array for serialization
    return Array.from(favoriteIds)
  } catch (error) {
    // Log full error for debugging
    fail('getFavoriteMovieIds - Error:', error)
    // Return empty array as fallback, but error is logged
    return []
  }
}
