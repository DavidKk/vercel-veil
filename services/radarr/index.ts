import { debug, fail, info } from '@/services/logger'

import { request } from './request'
import type { RadarrAddMovieRequest, RadarrMovie } from './types'

/**
 * Check if Radarr is configured
 * @returns true if both RADARR_URL and RADARR_API_KEY are set
 */
export function isRadarrConfigured(): boolean {
  return !!(process.env.RADARR_URL && process.env.RADARR_API_KEY)
}

/**
 * Get Radarr root folder (first available)
 * @returns Root folder path or null if not available
 */
export async function getRadarrRootFolder(): Promise<string | null> {
  try {
    const rootFolders = await request<Array<{ id: number; path: string }>>('rootFolder', {
      method: 'GET',
    })

    if (Array.isArray(rootFolders) && rootFolders.length > 0) {
      return rootFolders[0].path
    }

    return null
  } catch (error) {
    fail('Failed to get Radarr root folder:', error)
    return null
  }
}

/**
 * Get Radarr quality profile (first available)
 * @returns Quality profile ID or null if not available
 */
export async function getRadarrQualityProfile(): Promise<number | null> {
  try {
    const qualityProfiles = await request<Array<{ id: number; name: string }>>('qualityProfile', {
      method: 'GET',
    })

    if (Array.isArray(qualityProfiles) && qualityProfiles.length > 0) {
      return qualityProfiles[0].id
    }

    return null
  } catch (error) {
    fail('Failed to get Radarr quality profile:', error)
    return null
  }
}

/**
 * Add a movie to Radarr
 * @param movieData Movie data to add
 * @param customHeaders Custom headers to add to the request
 * @returns Added movie data
 */
export async function addMovie(movieData: RadarrAddMovieRequest, customHeaders?: Record<string, string>): Promise<RadarrMovie> {
  debug('Adding movie to Radarr', { tmdbId: movieData.tmdbId })

  const response = await request<RadarrMovie>(
    'movie',
    {
      method: 'POST',
      body: JSON.stringify(movieData),
    },
    customHeaders
  )

  debug('Movie added to Radarr successfully', { id: response.id, title: response.title })
  return response
}

/**
 * Delete a movie from Radarr
 * @param movieId Radarr movie ID
 * @param deleteFiles Whether to delete files (default: false)
 * @param customHeaders Custom headers to add to the request
 * @returns void
 */
export async function deleteMovie(movieId: number, deleteFiles = false, customHeaders?: Record<string, string>): Promise<void> {
  debug('Deleting movie from Radarr', { movieId, deleteFiles })

  // Radarr API: DELETE /api/v3/movie/{id}?deleteFiles={bool}
  const path = `movie/${movieId}${deleteFiles ? '?deleteFiles=true' : ''}`
  await request(
    path,
    {
      method: 'DELETE',
    },
    customHeaders
  )

  debug('Movie deleted from Radarr successfully', { movieId })
}

/**
 * Get movie by ID
 * @param movieId Radarr movie ID
 * @param customHeaders Custom headers to add to the request
 * @returns Movie data
 */
export async function getMovie(movieId: number, customHeaders?: Record<string, string>): Promise<RadarrMovie> {
  debug('Getting movie from Radarr', { movieId })

  const response = await request<RadarrMovie>(
    `movie/${movieId}`,
    {
      method: 'GET',
    },
    customHeaders
  )

  return response
}

/**
 * Add movie to Radarr asynchronously (fire and forget)
 * This function does not throw errors to avoid affecting the main flow
 * @param tmdbId TMDB movie ID
 * @param favorite Whether to add (true) or remove (false)
 */
export async function syncToRadarrAsync(tmdbId: number, favorite = true): Promise<void> {
  // Check if Radarr is configured
  if (!isRadarrConfigured()) {
    info('Radarr not configured, skipping sync')
    return
  }

  if (!favorite) {
    // If removing from favorites, we need to find and delete from Radarr
    // This is more complex, so we'll skip it for now
    info('Removing from Radarr not implemented yet, skipping')
    return
  }

  // Fire and forget - don't await, don't throw errors
  addMovieToRadarrAsync(tmdbId).catch((error) => {
    // Log error but don't throw to avoid affecting main flow
    fail(`Failed to sync movie ${tmdbId} to Radarr (async):`, error)
  })
}

/**
 * Add movie to Radarr with automatic configuration
 * @param tmdbId TMDB movie ID
 */
async function addMovieToRadarrAsync(tmdbId: number): Promise<void> {
  try {
    // Get default configuration from environment or API
    let rootFolderPath: string | null = process.env.RADARR_ROOT_FOLDER_PATH || null
    let qualityProfileId: number | null = process.env.RADARR_QUALITY_PROFILE_ID ? parseInt(process.env.RADARR_QUALITY_PROFILE_ID, 10) : null

    // If not configured in env, try to get from API
    if (!rootFolderPath) {
      rootFolderPath = await getRadarrRootFolder()
      if (!rootFolderPath) {
        fail('Radarr root folder not configured and cannot be retrieved from API')
        return
      }
    }

    if (!qualityProfileId) {
      qualityProfileId = await getRadarrQualityProfile()
      if (!qualityProfileId) {
        fail('Radarr quality profile not configured and cannot be retrieved from API')
        return
      }
    }

    // Check if movie already exists in Radarr
    try {
      const movies = await request<RadarrMovie[]>('movie', {
        method: 'GET',
      })

      if (Array.isArray(movies)) {
        const existing = movies.find((m) => m.tmdbId === tmdbId)
        if (existing) {
          info(`Movie ${tmdbId} already exists in Radarr, skipping`)
          return
        }
      }
    } catch (error) {
      // If check fails, continue to add (might be a different error)
      info('Could not check if movie exists in Radarr, proceeding to add')
    }

    // Add movie to Radarr
    const movieData: RadarrAddMovieRequest = {
      tmdbId,
      rootFolderPath,
      qualityProfileId,
      monitored: true,
      addOptions: {
        searchForMovie: true,
      },
    }

    await addMovie(movieData)
    info(`Movie ${tmdbId} added to Radarr successfully`)
  } catch (error) {
    fail(`Failed to add movie ${tmdbId} to Radarr:`, error)
    throw error
  }
}
