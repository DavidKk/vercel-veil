import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { debug, fail, info } from '@/services/logger'
import { resolvePreferredTitle } from '@/services/metadata/title'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { ensureWebhookAuthorized } from '@/utils/webhooks/auth'

import type { RadarrWebhookPayload } from './types'
import { isRadarrPayload } from './types'
import { prepareRadarrTemplateVariables } from './view'

export const runtime = 'nodejs'

/**
 * Handle Radarr webhook POST requests
 * Processes movie download/upgrade notifications and sends email using template system
 * @param req Next.js request object
 * @returns Response with status 202 on success
 */
export const POST = api(async (req: NextRequest) => {
  const startTime = Date.now()
  info('POST /api/webhooks/radarr - Webhook received')

  try {
    await ensureWebhookAuthorized(req)
    debug('Webhook authenticated successfully')

    const payload = (await req.json()) as RadarrWebhookPayload
    const movieTitle = payload.movie?.title ?? payload.remoteMovie?.title
    debug('Webhook payload:', { eventType: payload.eventType, movieTitle })

    if (!isRadarrPayload(payload)) {
      fail('Invalid Radarr payload structure')
      return jsonInvalidParameters('unsupported payload structure')
    }

    info(`Processing Radarr webhook: ${payload.eventType} for ${movieTitle || 'unknown movie'}`)

    const defaultTitle = movieTitle
    const preferredTitle = await resolvePreferredTitle({ defaultTitle, mediaType: 'movie' })
    debug(`Resolved preferred title: ${preferredTitle || defaultTitle}`)

    const variables = await prepareRadarrTemplateVariables(payload, preferredTitle)

    const template = getTemplate('radarr-default')
    if (!template) {
      fail('Template not found: radarr-default')
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

    info(`Sending notification email: ${subject}`)
    await sendNotification(subject, html)

    const duration = Date.now() - startTime
    info(`POST /api/webhooks/radarr - Success (${duration}ms)`, {
      eventType: payload.eventType,
      movieTitle: variables.movieTitle,
    })

    return {
      ...standardResponseSuccess({ source: 'radarr', eventType: payload.eventType }),
      status: 202,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`POST /api/webhooks/radarr - Error (${duration}ms):`, error)
    throw error
  }
})
