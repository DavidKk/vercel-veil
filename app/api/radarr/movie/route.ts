import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { ensureApiAuthorized } from '@/services/auth/api'
import { fail } from '@/services/logger'
import { addMovie, deleteMovie } from '@/services/radarr'
import type { RadarrAddMovieRequest } from '@/services/radarr/types'

export const runtime = 'nodejs'

/**
 * Extract custom headers from request
 * Headers starting with 'X-Radarr-' prefix will be forwarded to Radarr API
 * @param req Next.js request object
 * @returns Custom headers object
 */
function extractCustomHeaders(req: NextRequest): Record<string, string> {
  const customHeaders: Record<string, string> = {}
  const customHeaderPrefix = 'X-Radarr-'
  
  req.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith(customHeaderPrefix.toLowerCase())) {
      customHeaders[key] = value
    }
  })

  return customHeaders
}

/**
 * Handle POST request to add a movie to Radarr
 * @param req Next.js request object
 * @returns Response with added movie data
 */
export const POST = api(async (req: NextRequest) => {
  // Ensure API authorization
  await ensureApiAuthorized(req)

  // Extract custom headers to forward to Radarr
  const customHeaders = extractCustomHeaders(req)

  try {
    const body = await req.json() as RadarrAddMovieRequest

    // Validate required fields
    if (!body.tmdbId) {
      fail('Missing required field: tmdbId')
      return jsonInvalidParameters('tmdbId is required')
    }

    if (!body.rootFolderPath) {
      fail('Missing required field: rootFolderPath')
      return jsonInvalidParameters('rootFolderPath is required')
    }

    if (!body.qualityProfileId) {
      fail('Missing required field: qualityProfileId')
      return jsonInvalidParameters('qualityProfileId is required')
    }

    // Add movie to Radarr
    const movie = await addMovie(body, customHeaders)

    return {
      ...standardResponseSuccess({ source: 'radarr', action: 'add', movieId: movie.id }),
      data: movie,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    fail(`Failed to add movie to Radarr: ${errorMessage}`)
    return jsonInvalidParameters(errorMessage)
  }
})

/**
 * Handle DELETE request to delete a movie from Radarr
 * @param req Next.js request object
 * @returns Response with deletion status
 */
export const DELETE = api(async (req: NextRequest) => {
  // Ensure API authorization
  await ensureApiAuthorized(req)

  // Extract custom headers to forward to Radarr
  const customHeaders = extractCustomHeaders(req)

  try {
    const { searchParams } = new URL(req.url)
    const movieIdParam = searchParams.get('id')
    const deleteFilesParam = searchParams.get('deleteFiles')

    if (!movieIdParam) {
      fail('Missing required parameter: id')
      return jsonInvalidParameters('id parameter is required')
    }

    const movieId = parseInt(movieIdParam, 10)
    if (isNaN(movieId)) {
      fail('Invalid movie ID format')
      return jsonInvalidParameters('id must be a valid number')
    }

    const deleteFiles = deleteFilesParam === 'true' || deleteFilesParam === '1'

    // Delete movie from Radarr
    await deleteMovie(movieId, deleteFiles, customHeaders)

    return {
      ...standardResponseSuccess({ source: 'radarr', action: 'delete', movieId }),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    fail(`Failed to delete movie from Radarr: ${errorMessage}`)
    return jsonInvalidParameters(errorMessage)
  }
})

