import type { NextRequest } from 'next/server'

import { buildMoviesForTemplate } from '@/app/actions/email/utils'
import { cron } from '@/initializer/controller'
import { standardResponseSuccess } from '@/initializer/response'
import { fail, info } from '@/services/logger'
import type { MergedMovie } from '@/services/maoyan/types'
import { getMoviesFromGist, getUnnotifiedMovies, isMovieFromYearOrLater, markMoviesAsNotified, saveMoviesToGist } from '@/services/movies'
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

  // Get cache data
  const cacheData = await getMoviesFromGist()
  if (!cacheData) {
    info('No cache data found, skipping notification')
    return standardResponseSuccess()
  }

  // Get unnotified movies from cache (no need to compare with previous list)
  const unnotifiedMovies = getUnnotifiedMovies(cacheData)

  if (unnotifiedMovies.length === 0) {
    info('No unnotified movies found, skipping notification')
    return standardResponseSuccess()
  }

  // Filter movies to only include those released in the current year or later
  // This prevents old movies from being pushed when Maoyan re-releases them
  // Also includes upcoming movies (e.g., January movies in December)
  // Auto-mark old movies as notified to prevent them from appearing in future notifications
  const currentYear = new Date().getFullYear()
  const oldMoviesToMark: MergedMovie[] = []
  const filteredMovies = unnotifiedMovies.filter((movie) => {
    const { isValid, year: movieYear } = isMovieFromYearOrLater(movie, currentYear)

    // If movie is old (has valid year but < currentYear), mark it as notified
    if (movieYear !== null && !isValid) {
      oldMoviesToMark.push(movie)
      info(`Auto-marking old movie "${movie.name}" (year: ${movieYear}) as notified`)
      return false
    }

    // If movie is valid (year >= currentYear), include it
    if (isValid) {
      return true
    }

    // If neither year nor releaseDate is available, filter out
    // (cannot confirm if it's from current year or later)
    info(`Filtered out movie "${movie.name}": no valid year or releaseDate available`)
    return false
  })

  // Mark old movies as notified if any were found
  if (oldMoviesToMark.length > 0) {
    const updatedCacheData = markMoviesAsNotified(cacheData, oldMoviesToMark)
    try {
      await saveMoviesToGist(updatedCacheData)
      info(`Auto-marked ${oldMoviesToMark.length} old movies as notified and updated cache`)
      // Update cacheData for subsequent operations
      Object.assign(cacheData, updatedCacheData)
    } catch (error) {
      fail('Failed to auto-mark old movies as notified (non-blocking):', error)
      // Continue with notification process even if save fails
    }
  }

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
    `Found ${hotMovies.length} hot unnotified movies from ${currentYear} or later (filtered from ${unnotifiedMovies.length} total unnotified movies, ${filteredMovies.length} from current year), preparing notification email`
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

  // Mark movies as notified and update cache
  const updatedCacheData = markMoviesAsNotified(cacheData, hotMovies)
  try {
    await saveMoviesToGist(updatedCacheData)
    info(`Successfully marked ${hotMovies.length} movies as notified and updated cache`)
  } catch (error) {
    fail('Failed to save notified movie IDs to cache (non-blocking):', error)
    // Don't throw - notification was sent successfully
  }

  info(`Notification email sent successfully for ${hotMovies.length} hot unnotified movies from ${currentYear} or later`)

  return standardResponseSuccess()
})
