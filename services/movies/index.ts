import type { MergedMovie } from '@/services/maoyan/types'

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
