import type { NextRequest } from 'next/server'

import { buildMoviesForTemplate } from '@/app/actions/email/utils'
import { cron } from '@/initializer/controller'
import { standardResponseSuccess } from '@/initializer/response'
import { fail, info } from '@/services/logger'
import { getMoviesFromGist, getNewMoviesFromCache } from '@/services/movies'
import { filterHotMovies } from '@/services/movies/popularity'
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

  // Filter movies to only include those released in the current year or later
  // This prevents old movies from being pushed when Maoyan re-releases them
  // Also includes upcoming movies (e.g., January movies in December)
  const currentYear = new Date().getFullYear()
  const filteredMovies = newMovies.filter((movie) => {
    // Check year field first (most reliable)
    if (movie.year !== undefined && movie.year !== null) {
      return movie.year >= currentYear
    }

    // Fallback to releaseDate if year is not available
    if (movie.releaseDate) {
      const releaseYear = new Date(movie.releaseDate).getFullYear()
      return releaseYear >= currentYear
    }

    // If neither year nor releaseDate is available, filter out
    // (cannot confirm if it's from current year or later)
    return false
  })

  if (filteredMovies.length === 0) {
    info(`No new movies from ${currentYear} or later found after filtering, skipping notification`)
    return standardResponseSuccess()
  }

  // Filter movies to only include hot movies (highly anticipated or very hot)
  // This filters out niche and average movies to focus on popular content
  const hotMovies = filterHotMovies(filteredMovies)

  if (hotMovies.length === 0) {
    info(`No hot movies found after popularity filtering (filtered from ${filteredMovies.length} movies), skipping notification`)
    return standardResponseSuccess()
  }

  info(
    `Found ${hotMovies.length} hot new movies from ${currentYear} or later (filtered from ${newMovies.length} total new movies, ${filteredMovies.length} from current year), preparing notification email`
  )

  // Generate a single share token for the entire email
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

  // Prepare movies data for template
  const moviesForTemplate = buildMoviesForTemplate(hotMovies, shareToken, baseUrl)

  const templateVariables: Record<string, string> = {
    newMoviesCount: String(hotMovies.length),
    isPlural: hotMovies.length > 1 ? 'true' : '',
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
  const subject = `[Movies] Found ${hotMovies.length} new movie${hotMovies.length > 1 ? 's' : ''}`
  await sendNotification(subject, html)

  info(`Notification email sent successfully for ${hotMovies.length} hot new movies from ${currentYear} or later`)

  return standardResponseSuccess()
})
