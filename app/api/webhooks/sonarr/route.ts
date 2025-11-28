import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { resolvePreferredTitle } from '@/services/metadata/title'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { ensureAuthorized } from '@/utils/webhooks/auth'

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
  ensureAuthorized(req)

  const payload = (await req.json()) as SonarrWebhookPayload
  if (!isSonarrPayload(payload)) {
    return jsonInvalidParameters('unsupported payload structure')
  }

  const preferredTitle = await resolvePreferredTitle({ defaultTitle: payload.series?.title, mediaType: 'series' })

  const variables = await prepareSonarrTemplateVariables(payload, preferredTitle)

  const template = getTemplate('sonarr-default')
  if (!template) {
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

  await sendNotification(subject, html)

  return {
    ...standardResponseSuccess({ source: 'sonarr', eventType: payload.eventType }),
    status: 202,
  }
})
