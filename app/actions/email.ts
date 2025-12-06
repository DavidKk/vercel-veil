'use server'

import { validateCookie } from '@/services/auth/access'
import { debug, fail, info } from '@/services/logger'
import { getMoviesFromGist, getNewMoviesFromCache } from '@/services/movies'
import { sendEmail } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'

function requireEnv(key: string) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} is not configured`)
  }
  return value
}

/**
 * Get real new movies data for movies-new template preview
 * This is a server action that fetches actual new movies from cache
 */
async function getRealMoviesDataForPreview(): Promise<Record<string, string> | null> {
  try {
    const cacheData = await getMoviesFromGist()
    const newMovies = getNewMoviesFromCache(cacheData)

    if (newMovies.length === 0) {
      return null
    }

    // Use VERCEL_URL or default to localhost for preview
    const vercelUrl = process.env.VERCEL_URL
    const baseUrl = vercelUrl ? `https://${vercelUrl}` : 'http://localhost:3000'
    const currentDate = new Date().toISOString().split('T')[0]

    // Prepare movies data for template (limit to 6 for preview)
    const moviesForTemplate = newMovies.slice(0, 6).map((movie) => {
      // Build detail page URL - prefer tmdbId, fallback to maoyanId
      const detailUrl = movie.tmdbId ? `${baseUrl}/movies/${movie.tmdbId}` : `${baseUrl}/movies/${movie.maoyanId}`

      return {
        poster: movie.tmdbPoster || movie.poster || 'https://via.placeholder.com/80x120?text=No+Image',
        name: movie.name || 'Unknown',
        year: movie.year || null,
        score: movie.score || null,
        releaseDate: movie.releaseDate || null,
        genres: movie.genres && movie.genres.length > 0 ? movie.genres : null,
        maoyanUrl: movie.maoyanUrl || null,
        tmdbUrl: movie.tmdbUrl || null,
        detailUrl,
      }
    })

    // Generate share URL for preview (use a dummy token)
    const shareUrl = `${baseUrl}/movies/share/preview-token`

    return {
      newMoviesCount: String(newMovies.length),
      isPlural: newMovies.length > 1 ? 'true' : '',
      newMoviesJSON: JSON.stringify(moviesForTemplate),
      shareUrl,
      currentDate,
    }
  } catch (error) {
    fail('Failed to fetch real movies data for preview:', error)
    return null
  }
}

/**
 * Preview email template (Server Action)
 * NOTE: This is for internal test page use only. External users should use webhook APIs:
 * - POST /api/webhooks/sonarr
 * - POST /api/webhooks/radarr
 */
export async function previewEmailTemplate(templateId: string, variables: Record<string, string> = {}) {
  const startTime = Date.now()
  info(`previewEmailTemplate - Request received for template: ${templateId}`)

  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to template preview')
      throw new Error('Unauthorized')
    }

    const template = getTemplate(templateId)
    if (!template) {
      fail(`Template not found: ${templateId}`)
      throw new Error('Template not found')
    }

    debug(`Template preview request: templateId=${templateId}, variableCount=${Object.keys(variables).length}`)

    // Special handling for movies-new template: use real new movies data
    let mergedVariables: Record<string, string>
    if (templateId === 'movies-new') {
      const realData = await getRealMoviesDataForPreview()
      if (realData) {
        // Use real data, but allow user to override specific variables
        mergedVariables = { ...realData, ...variables }
        info(`Using real new movies data for preview: ${realData.newMoviesCount} movies`)
      } else {
        // No new movies found, use default variables
        info('No new movies found, using default variables for preview')
        mergedVariables = { ...template.defaultVariables, ...variables }
      }
    } else {
      // For other templates, use default variables
      mergedVariables = { ...template.defaultVariables, ...variables }
    }

    const html = renderTemplate(template.html, mergedVariables)

    const duration = Date.now() - startTime
    info(`previewEmailTemplate - Success (${duration}ms)`, {
      templateId,
      variableCount: Object.keys(mergedVariables).length,
    })

    return { success: true, html }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`previewEmailTemplate - Error (${duration}ms):`, error)
    throw error
  }
}

/**
 * Send test email (Server Action)
 * NOTE: This is for internal test page use only. External users should use webhook APIs:
 * - POST /api/webhooks/sonarr
 * - POST /api/webhooks/radarr
 */
export async function sendTestEmail(templateId: string, variables: Record<string, string> = {}, recipient?: string) {
  const startTime = Date.now()
  info(`sendTestEmail - Request received for template: ${templateId}`)

  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to template send')
      throw new Error('Unauthorized')
    }

    const template = getTemplate(templateId)
    if (!template) {
      fail(`Template not found: ${templateId}`)
      throw new Error('Template not found')
    }

    // Special handling for movies-new template: use real new movies data
    let mergedVariables: Record<string, string>
    if (templateId === 'movies-new') {
      const realData = await getRealMoviesDataForPreview()
      if (realData) {
        // Use real data, but allow user to override specific variables
        mergedVariables = { ...realData, ...variables }
        info(`Using real new movies data for test email: ${realData.newMoviesCount} movies`)
      } else {
        // No new movies found, use default variables
        info('No new movies found, using default variables for test email')
        mergedVariables = { ...template.defaultVariables, ...variables }
      }
    } else {
      // For other templates, use default variables
      mergedVariables = { ...template.defaultVariables, ...variables }
    }

    debug(`Sending test email for template: ${templateId}`, {
      customRecipient: recipient || 'default',
      variableCount: Object.keys(mergedVariables).length,
    })

    const html = renderTemplate(template.html, mergedVariables)

    const apiKey = requireEnv('RESEND_API_KEY')
    const from = requireEnv('NOTIFICATION_EMAIL_FROM')
    const defaultTo = requireEnv('NOTIFICATION_EMAIL_TO')

    const recipients = recipient || defaultTo
    const subject = `[Preview] ${template.name} - ${new Date().toLocaleString()}`

    info(`Sending test email: ${subject} to ${recipients}`)
    const response = await sendEmail(apiKey, {
      from,
      to: recipients,
      subject,
      html,
    })

    const duration = Date.now() - startTime
    info(`sendTestEmail - Success (${duration}ms)`, {
      templateId,
      recipients,
      emailId: response?.id,
    })

    return { success: true, data: response }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`sendTestEmail - Error (${duration}ms):`, error)
    throw error
  }
}
