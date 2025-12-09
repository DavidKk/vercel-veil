import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { ensureWebhookAuthorized } from '@/services/auth/api'
import { fail } from '@/services/logger'
import { resolvePreferredTitle } from '@/services/metadata/title'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'

import type { SonarrWebhookPayload } from './types'
import { isSonarrPayload } from './types'
import { prepareSonarrTemplateVariables } from './view'

export const runtime = 'nodejs'

/**
 * Map Sonarr event type to template ID
 * @param eventType Event type from webhook payload
 * @returns Template ID for the event type, or null if not found
 */
function getTemplateIdForEventType(eventType: string): string | null {
  const templateMap: Record<string, string> = {
    Test: 'sonarr-test',
    Grab: 'sonarr-grab',
    Download: 'sonarr-download',
    Upgrade: 'sonarr-upgrade',
    Rename: 'sonarr-rename',
    EpisodeFileDelete: 'sonarr-episodefiledelete',
    SeriesDelete: 'sonarr-seriesdelete',
  }
  return templateMap[eventType] ?? null
}

/**
 * Handle Sonarr webhook POST requests
 * Processes TV series download/upgrade notifications and sends email using template system
 * @param req Next.js request object
 * @returns Response with status 202 on success
 */
export const POST = api(async (req: NextRequest) => {
  await ensureWebhookAuthorized(req)

  const payload = (await req.json()) as SonarrWebhookPayload

  if (!isSonarrPayload(payload)) {
    fail('Invalid Sonarr payload structure')
    return jsonInvalidParameters('unsupported payload structure')
  }

  const preferredTitle = await resolvePreferredTitle({ defaultTitle: payload.series?.title, mediaType: 'series' })
  const variables = await prepareSonarrTemplateVariables(payload, preferredTitle)

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
    seriesTitle: variables.seriesTitle,
    eventType: variables.eventType,
    actionLabel: variables.actionLabel,
    instanceName: variables.instanceName,
    downloadClient: variables.downloadClient,
    isUpgrade: variables.isUpgrade,
    episodeListJSON: variables.episodeListJSON,
    releaseDetailsJSON: variables.releaseDetailsJSON,
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
