'use server'

import { validateCookie } from '@/services/auth/access'
import { fail, info } from '@/services/logger'
import { getMergedMoviesList, type GetMergedMoviesListOptions } from '@/services/maoyan'
import type { MergedMovie } from '@/services/maoyan/types'
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
  const startTime = Date.now()
  info('getMoviesList - Request received', options)

  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to movies list')
      throw new Error('Unauthorized')
    }

    const movies = await getMergedMoviesList(options)

    const duration = Date.now() - startTime
    info(`getMoviesList - Success (${duration}ms), returned ${movies.length} movies`)

    return movies
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`getMoviesList - Error (${duration}ms):`, error)
    throw error
  }
}

/**
 * Add movie to TMDB favorites list (Server Action)
 * Internal use only, requires authentication
 */
export async function favoriteMovie(movieId: number, favorite = true): Promise<{ success: boolean; message: string }> {
  const startTime = Date.now()
  info(`favoriteMovie - Request received: movieId=${movieId}, favorite=${favorite}`)

  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to favorite movie')
      throw new Error('Unauthorized')
    }

    await addToFavorites(movieId, favorite)

    const duration = Date.now() - startTime
    const action = favorite ? 'added to' : 'removed from'
    info(`favoriteMovie - Success (${duration}ms), movie ${movieId} ${action} favorites`)

    return {
      success: true,
      message: favorite ? 'Added to favorites' : 'Removed from favorites',
    }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`favoriteMovie - Error (${duration}ms):`, error)

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
 */
export async function isFavoriteFeatureAvailable(): Promise<boolean> {
  try {
    if (!(await validateCookie())) {
      return false
    }
    return hasTmdbAuth()
  } catch {
    return false
  }
}

/**
 * Get user's favorite movie IDs (Server Action)
 * Internal use only, requires authentication
 * Returns array instead of Set for serialization
 */
export async function getFavoriteMovieIds(): Promise<number[]> {
  const startTime = Date.now()
  info('getFavoriteMovieIds - Request received')

  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to favorite movie IDs')
      return []
    }

    if (!hasTmdbAuth()) {
      return []
    }

    const favoriteIds = await getFavoriteMovies()

    const duration = Date.now() - startTime
    info(`getFavoriteMovieIds - Success (${duration}ms), returned ${favoriteIds.size} favorite movies`)

    // Convert Set to Array for serialization
    return Array.from(favoriteIds)
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`getFavoriteMovieIds - Error (${duration}ms):`, error)
    return []
  }
}
