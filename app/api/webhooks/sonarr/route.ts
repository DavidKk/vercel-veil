import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { debug, fail, info } from '@/services/logger'
import { resolvePreferredTitle } from '@/services/metadata/title'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { ensureWebhookAuthorized } from '@/utils/webhooks/auth'

import type { SonarrWebhookPayload } from './types'
import { isSonarrPayload } from './types'
import { prepareSonarrTemplateVariables } from './view'

export const runtime = 'nodejs'

/**
 * Handle Sonarr webhook POST requests
 * Processes TV series download/upgrade notifications and sends email using template system
 * @param req Next.js request object
 * @returns Response with status 202 on success
 */
export const POST = api(async (req: NextRequest) => {
  const startTime = Date.now()
  info('POST /api/webhooks/sonarr - Webhook received')

  try {
    await ensureWebhookAuthorized(req)
    debug('Webhook authenticated successfully')

    const payload = (await req.json()) as SonarrWebhookPayload
    debug('Webhook payload:', { eventType: payload.eventType, seriesTitle: payload.series?.title })

    if (!isSonarrPayload(payload)) {
      fail('Invalid Sonarr payload structure')
      return jsonInvalidParameters('unsupported payload structure')
    }

    info(`Processing Sonarr webhook: ${payload.eventType} for ${payload.series?.title || 'unknown series'}`)

    const preferredTitle = await resolvePreferredTitle({ defaultTitle: payload.series?.title, mediaType: 'series' })
    debug(`Resolved preferred title: ${preferredTitle || payload.series?.title}`)

    const variables = await prepareSonarrTemplateVariables(payload, preferredTitle)

    const template = getTemplate('sonarr-default')
    if (!template) {
      fail('Template not found: sonarr-default')
      return jsonInvalidParameters('template not found')
    }

    const templateVariables: Record<string, string> = {
      seriesTitle: variables.seriesTitle,
      eventType: variables.eventType,
      actionLabel: variables.actionLabel,
      instanceName: variables.instanceName,
      downloadClient: variables.downloadClient,
      isUpgrade: variables.isUpgrade,
      episodeList: variables.episodeList,
      releaseDetails: variables.releaseDetails,
      coverImage: variables.coverImage,
      synopsis: variables.synopsis,
      detailUrl: variables.detailUrl,
    }

    const html = renderTemplate(template.html, templateVariables)
    const subject = `[Sonarr][${variables.eventType}] ${variables.seriesTitle}`

    info(`Sending notification email: ${subject}`)
    await sendNotification(subject, html)

    const duration = Date.now() - startTime
    info(`POST /api/webhooks/sonarr - Success (${duration}ms)`, {
      eventType: payload.eventType,
      seriesTitle: variables.seriesTitle,
    })

    return {
      ...standardResponseSuccess({ source: 'sonarr', eventType: payload.eventType }),
      status: 202,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`POST /api/webhooks/sonarr - Error (${duration}ms):`, error)
    throw error
  }
})
