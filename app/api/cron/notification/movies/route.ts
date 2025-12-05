import type { NextRequest } from 'next/server'

import { cron } from '@/initializer/controller'
import { standardResponseSuccess } from '@/initializer/response'
import { fail, info } from '@/services/logger'
import { getMoviesFromGist, getNewMoviesFromCache } from '@/services/movies'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { generateShareToken } from '@/utils/jwt'
import { getBaseUrl } from '@/utils/url'

export const runtime = 'nodejs'

/**
 * Movies notification cron job
 * Cron expression: 0 2 * * *
 * Executes at UTC 02:00 daily
 */
export const GET = cron(async (req: NextRequest) => {
  info('Movies notification handler started')

  // Get new movies from cache
  const newMovies = getNewMoviesFromCache(await getMoviesFromGist())

  if (newMovies.length === 0) {
    info('No new movies found, skipping notification')
    return standardResponseSuccess()
  }

  info(`Found ${newMovies.length} new movies, preparing notification email`)

  // Generate share token
  const shareToken = generateShareToken('movie-share', '1d')
  const baseUrl = getBaseUrl(req)
  const shareUrl = `${baseUrl}/movies/share/${shareToken}`

  // Get email template
  const template = getTemplate('movies-new')
  if (!template) {
    fail('Template not found: movies-new')
    throw new Error('Email template not found')
  }

  // Prepare template variables
  const currentDate = new Date().toISOString().split('T')[0]

  // Prepare movies data for template (raw data, no HTML formatting)
  const moviesForTemplate = newMovies.map((movie) => ({
    poster: movie.tmdbPoster || movie.poster || 'https://via.placeholder.com/80x120?text=No+Image',
    name: movie.name || 'Unknown',
    year: movie.year || null,
    score: movie.score || null,
    releaseDate: movie.releaseDate || null,
    genres: movie.genres && movie.genres.length > 0 ? movie.genres : null,
    maoyanUrl: movie.maoyanUrl || null,
    tmdbUrl: movie.tmdbUrl || null,
  }))

  const templateVariables: Record<string, string> = {
    newMoviesCount: String(newMovies.length),
    isPlural: newMovies.length > 1 ? 'true' : '',
    newMoviesJSON: JSON.stringify(moviesForTemplate),
    shareUrl,
    currentDate,
  }

  // Log template variables for debugging
  info('Template variables:', {
    newMoviesCount: templateVariables.newMoviesCount,
    isPlural: templateVariables.isPlural,
    moviesCount: moviesForTemplate.length,
    sampleMovie: moviesForTemplate[0]
      ? {
          name: moviesForTemplate[0].name,
          year: moviesForTemplate[0].year,
          score: moviesForTemplate[0].score,
          genres: moviesForTemplate[0].genres,
          hasGenres: !!moviesForTemplate[0].genres && moviesForTemplate[0].genres.length > 0,
        }
      : null,
    shareUrl: templateVariables.shareUrl,
    currentDate: templateVariables.currentDate,
  })

  // Render email HTML
  const html = renderTemplate(template.html, templateVariables)

  // Send email notification
  const subject = `[Movies] Found ${newMovies.length} new movie${newMovies.length > 1 ? 's' : ''}`
  await sendNotification(subject, html)

  info(`Notification email sent successfully for ${newMovies.length} new movies`)

  return standardResponseSuccess()
})
