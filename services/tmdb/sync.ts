import { fail, info } from '@/services/logger'
import { hasTmdbAuth } from '@/services/tmdb/env'

import { addToFavorites, getFavoriteMovies, searchMulti } from './index'

export interface SyncMovieResult {
  tmdbId: number
  title: string
  success: boolean
  skipped: boolean
  error?: string
}

export interface SyncMoviesResult {
  synced: number
  skipped: number
  failed: number
  total: number
  results: SyncMovieResult[]
}

/**
 * Add movie to TMDB favorites asynchronously (fire and forget)
 * This function does not throw errors to avoid affecting the main flow
 * @param tmdbId TMDB movie ID
 * @param favorite Whether to favorite (true=add, false=remove)
 */
export async function syncToTMDBFavoritesAsync(tmdbId: number | undefined, favorite = true): Promise<void> {
  // Check if TMDB auth is configured
  if (!hasTmdbAuth()) {
    info('TMDB authentication not configured, skipping favorite sync')
    return
  }

  if (!tmdbId) {
    info('No TMDB ID provided, skipping favorite sync')
    return
  }

  // Fire and forget - don't await, don't throw errors
  addToFavorites(tmdbId, favorite).catch((error) => {
    // Log error but don't throw to avoid affecting main flow
    fail(`Failed to sync movie ${tmdbId} to TMDB favorites (async):`, error)
  })
}

/**
 * Sync movie list to TMDB favorites
 * @param movies Array of movies with optional tmdbId
 * @param options Options for syncing
 * @returns Sync result with statistics
 */
export async function syncMoviesToTMDBFavorites(
  movies: Array<{ tmdbId?: number | string; title: string }>,
  options: { searchMissingIds?: boolean } = {}
): Promise<SyncMoviesResult> {
  const { searchMissingIds = false } = options

  // Check if TMDB auth is configured
  if (!hasTmdbAuth()) {
    throw new Error('TMDB authentication not configured')
  }

  // Get existing favorites to avoid duplicates
  const existingFavorites = await getFavoriteMovies()
  info(`Found ${existingFavorites.size} existing favorite movies in TMDB`)

  // Process movies: search for missing IDs if needed, then sync
  const results = await Promise.allSettled(
    movies.map(async (movie): Promise<SyncMovieResult> => {
      let tmdbId: number | undefined = movie.tmdbId ? (typeof movie.tmdbId === 'number' ? movie.tmdbId : parseInt(String(movie.tmdbId), 10)) : undefined

      // If no TMDB ID and search is enabled, try to search for it
      if ((!tmdbId || isNaN(tmdbId)) && searchMissingIds) {
        try {
          info(`Searching for TMDB ID for movie: ${movie.title}`)
          const searchResults = await searchMulti(movie.title)

          if (searchResults && searchResults.length > 0) {
            // Find the first movie result (not TV series)
            const movieResult = searchResults.find((result) => result.media_type === 'movie')
            if (movieResult && movieResult.id) {
              tmdbId = movieResult.id
              info(`Found TMDB ID ${tmdbId} for movie: ${movie.title}`)
            } else {
              throw new Error(`No movie match found in TMDB for: ${movie.title}`)
            }
          } else {
            throw new Error(`No results found in TMDB for: ${movie.title}`)
          }
        } catch (error) {
          fail(`Failed to find TMDB ID for movie "${movie.title}":`, error)
          throw new Error(`Failed to find TMDB ID: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      if (!tmdbId || isNaN(tmdbId)) {
        throw new Error(`Invalid or missing TMDB ID for movie: ${movie.title}`)
      }

      // Check if already in favorites
      if (existingFavorites.has(tmdbId)) {
        info(`Movie "${movie.title}" (TMDB ID: ${tmdbId}) is already in favorites, skipping`)
        return { tmdbId, title: movie.title, success: true, skipped: true }
      }

      // Add to TMDB favorites
      try {
        await addToFavorites(tmdbId, true)
        info(`Successfully synced movie "${movie.title}" (TMDB ID: ${tmdbId}) to TMDB favorites`)
        return { tmdbId, title: movie.title, success: true, skipped: false }
      } catch (error) {
        fail(`Failed to sync movie "${movie.title}" (TMDB ID: ${tmdbId}) to TMDB favorites:`, error)
        throw error
      }
    })
  )

  // Process results
  const syncResults: SyncMovieResult[] = results.map((r, index) => {
    if (r.status === 'fulfilled') {
      return r.value
    } else {
      const movie = movies[index]
      return {
        tmdbId: movie.tmdbId ? (typeof movie.tmdbId === 'number' ? movie.tmdbId : parseInt(String(movie.tmdbId), 10)) : 0,
        title: movie.title,
        success: false,
        skipped: false,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      }
    }
  })

  const synced = syncResults.filter((r) => r.success && !r.skipped).length
  const skipped = syncResults.filter((r) => r.success && r.skipped).length
  const failed = syncResults.filter((r) => !r.success).length

  return {
    synced,
    skipped,
    failed,
    total: movies.length,
    results: syncResults,
  }
}

/**
 * Sync movie list to TMDB favorites asynchronously (fire and forget)
 * This function does not throw errors to avoid affecting the main flow
 * @param movies Array of movies with tmdbId
 */
export async function syncMovieListToTMDBFavoritesAsync(movies: Array<{ tmdbId?: number | string; title: string }>): Promise<void> {
  // Check if TMDB auth is configured
  if (!hasTmdbAuth()) {
    info('TMDB authentication not configured, skipping favorite sync')
    return
  }

  // Fire and forget - don't await, don't throw errors
  syncMoviesToTMDBFavorites(movies, { searchMissingIds: false }).catch((error) => {
    // Log error but don't throw to avoid affecting main flow
    fail('Error in async movie list sync to TMDB favorites:', error)
  })
}
