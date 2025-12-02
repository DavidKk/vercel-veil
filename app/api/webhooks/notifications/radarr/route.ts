import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { fail } from '@/services/logger'
import { resolvePreferredTitle } from '@/services/metadata/title'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { syncToTMDBFavoritesAsync } from '@/services/tmdb/sync'
import { ensureWebhookAuthorized } from '@/utils/webhooks/auth'

import type { RadarrWebhookPayload } from './types'
import { isRadarrPayload } from './types'
import { prepareRadarrTemplateVariables } from './view'

export const runtime = 'nodejs'

/**
 * Map Radarr event type to template ID
 * @param eventType Event type from webhook payload
 * @returns Template ID for the event type, or null if not found
 */
function getTemplateIdForEventType(eventType: string): string | null {
  const templateMap: Record<string, string> = {
    Test: 'radarr-test',
    Grab: 'radarr-grab',
    Download: 'radarr-download',
    Upgrade: 'radarr-upgrade',
    MovieDelete: 'radarr-moviedelete',
    MovieFileDelete: 'radarr-moviefiledelete',
  }
  return templateMap[eventType] ?? null
}

/**
 * Handle Radarr webhook POST requests
 * Processes movie download/upgrade notifications and sends email using template system
 * @param req Next.js request object
 * @returns Response with status 202 on success
 */
export const POST = api(async (req: NextRequest) => {
  await ensureWebhookAuthorized(req)

  const payload = (await req.json()) as RadarrWebhookPayload
  const movieTitle = payload.movie?.title ?? payload.remoteMovie?.title

  if (!isRadarrPayload(payload)) {
    fail('Invalid Radarr payload structure')
    return jsonInvalidParameters('unsupported payload structure')
  }

  const defaultTitle = movieTitle
  const preferredTitle = await resolvePreferredTitle({ defaultTitle, mediaType: 'movie' })
  const variables = await prepareRadarrTemplateVariables(payload, preferredTitle)

  // Map event type to template ID
  const templateId = getTemplateIdForEventType(payload.eventType)
  if (!templateId) {
    fail(`Template ID not found for event type: ${payload.eventType}`)
    return jsonInvalidParameters('template not found')
  }

  const template = getTemplate(templateId)
  if (!template) {
    fail(`Template not found: ${templateId}`)
    return jsonInvalidParameters('template not found')
  }

  const templateVariables: Record<string, string> = {
    movieTitle: variables.movieTitle,
    eventType: variables.eventType,
    actionLabel: variables.actionLabel,
    year: variables.year,
    instanceName: variables.instanceName,
    downloadClient: variables.downloadClient,
    isUpgrade: variables.isUpgrade,
    releaseDetails: variables.releaseDetails,
    coverImage: variables.coverImage,
    synopsis: variables.synopsis,
    detailUrl: variables.detailUrl,
  }

  const html = renderTemplate(template.html, templateVariables)

  const year = variables.year ? ` (${variables.year})` : ''
  const subject = `[Radarr][${variables.eventType}] ${variables.movieTitle}${year}`

  await sendNotification(subject, html)

  // Async sync to TMDB favorites (fire and forget, doesn't affect webhook flow)
  // Only sync on Download or Upgrade events (when movie is actually downloaded)
  if ((payload.eventType === 'Download' || payload.eventType === 'Upgrade') && payload.movie?.tmdbId) {
    syncToTMDBFavoritesAsync(payload.movie.tmdbId, true).catch((error) => {
      // Error already logged in syncToTMDBFavoritesAsync, just catch to prevent unhandled rejection
      fail('TMDB favorite sync failed (non-blocking):', error)
    })
  }

  return {
    ...standardResponseSuccess({ source: 'radarr', eventType: payload.eventType }),
    status: 202,
  }
})
