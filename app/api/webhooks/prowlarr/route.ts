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

  const template = getTemplate('prowlarr-default')
  if (!template) {
    fail('Template not found: prowlarr-default')
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
    applicationUrl: variables.applicationUrl,
  }

  const html = renderTemplate(template.html, templateVariables)
  const subject = `[Prowlarr][${variables.eventType}] ${variables.indexerName}`

  await sendNotification(subject, html)

  return {
    ...standardResponseSuccess({ source: 'prowlarr', eventType: payload.eventType }),
    status: 202,
  }
})
