import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { fail } from '@/services/logger'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { ensureProwlarrAuthorized } from '@/utils/webhooks/auth'

import type { ProwlarrWebhookPayload } from './types'
import { isProwlarrPayload } from './types'
import { prepareProwlarrTemplateVariables } from './view'

export const runtime = 'nodejs'

/**
 * Map Prowlarr event type to template ID
 * @param eventType Event type from webhook payload
 * @returns Template ID for the event type, or null if not found
 */
function getTemplateIdForEventType(eventType: string): string | null {
  const templateMap: Record<string, string> = {
    Grab: 'prowlarr-grab',
    IndexerStatusChange: 'prowlarr-indexerstatuschange',
    IndexerUpdate: 'prowlarr-indexerupdate',
    IndexerDelete: 'prowlarr-indexerdelete',
    IndexerAdded: 'prowlarr-indexeradded',
  }
  return templateMap[eventType] ?? null
}

/**
 * Handle Prowlarr webhook POST requests
 * Processes indexer status change/update notifications and sends email using template system
 * @param req Next.js request object
 * @returns Response with status 202 on success
 */
export const POST = api(async (req: NextRequest) => {
  await ensureProwlarrAuthorized(req)

  const payload = (await req.json()) as ProwlarrWebhookPayload

  if (!isProwlarrPayload(payload)) {
    fail('Invalid Prowlarr payload structure')
    return jsonInvalidParameters('unsupported payload structure')
  }

  const variables = await prepareProwlarrTemplateVariables(payload)

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
    indexerName: variables.indexerName,
    eventType: variables.eventType,
    actionLabel: variables.actionLabel,
    instanceName: variables.instanceName,
    protocol: variables.protocol,
    statusChange: variables.statusChange,
    message: variables.message,
    indexerDetails: variables.indexerDetails,
    releaseDetails: variables.releaseDetails,
    applicationUrl: variables.applicationUrl,
  }

  const html = renderTemplate(template.html, templateVariables)

  // For Grab events, use release title if available, otherwise use indexer name
  let subject = `[Prowlarr][${variables.eventType}] ${variables.indexerName}`
  if (payload.eventType === 'Grab' && payload.release?.releaseTitle) {
    subject = `[Prowlarr][Grab] ${payload.release.releaseTitle}`
  }

  await sendNotification(subject, html)

  return {
    ...standardResponseSuccess({ source: 'prowlarr', eventType: payload.eventType }),
    status: 202,
  }
})
