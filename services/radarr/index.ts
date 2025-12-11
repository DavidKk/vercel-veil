import { debug } from '@/services/logger'

import { request } from './request'
import type { RadarrAddMovieRequest, RadarrMovie } from './types'

/**
 * Add a movie to Radarr
 * @param movieData Movie data to add
 * @param customHeaders Custom headers to add to the request
 * @returns Added movie data
 */
export async function addMovie(
  movieData: RadarrAddMovieRequest,
  customHeaders?: Record<string, string>
): Promise<RadarrMovie> {
  debug('Adding movie to Radarr', { tmdbId: movieData.tmdbId })

  const response = await request<RadarrMovie>('movie', {
    method: 'POST',
    body: JSON.stringify(movieData),
  }, customHeaders)

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
export async function deleteMovie(
  movieId: number,
  deleteFiles: boolean = false,
  customHeaders?: Record<string, string>
): Promise<void> {
  debug('Deleting movie from Radarr', { movieId, deleteFiles })

  // Radarr API: DELETE /api/v3/movie/{id}?deleteFiles={bool}
  const path = `movie/${movieId}${deleteFiles ? '?deleteFiles=true' : ''}`
  await request(path, {
    method: 'DELETE',
  }, customHeaders)

  debug('Movie deleted from Radarr successfully', { movieId })
}

/**
 * Get movie by ID
 * @param movieId Radarr movie ID
 * @param customHeaders Custom headers to add to the request
 * @returns Movie data
 */
export async function getMovie(
  movieId: number,
  customHeaders?: Record<string, string>
): Promise<RadarrMovie> {
  debug('Getting movie from Radarr', { movieId })

  const response = await request<RadarrMovie>(`movie/${movieId}`, {
    method: 'GET',
  }, customHeaders)

  return response
}

