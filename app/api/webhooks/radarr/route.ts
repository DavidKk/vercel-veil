import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { fail } from '@/services/logger'
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
  try {
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

    await sendNotification(subject, html)

    return {
      ...standardResponseSuccess({ source: 'radarr', eventType: payload.eventType }),
      status: 202,
    }
  } catch (error) {
    fail('POST /api/webhooks/radarr - Error:', error)
    throw error
  }
})
