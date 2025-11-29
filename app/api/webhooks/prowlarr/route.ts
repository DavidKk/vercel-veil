import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { debug, fail, info } from '@/services/logger'
import { sendNotification } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'
import { ensureAuthorized } from '@/utils/webhooks/auth'

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
  const startTime = Date.now()
  info('POST /api/webhooks/prowlarr - Webhook received')

  try {
    ensureAuthorized(req)
    debug('Webhook authenticated successfully')

    const payload = (await req.json()) as ProwlarrWebhookPayload
    const indexerName = payload.indexer?.name ?? payload.indexers?.[0]?.name
    debug('Webhook payload:', { eventType: payload.eventType, indexerName })

    if (!isProwlarrPayload(payload)) {
      fail('Invalid Prowlarr payload structure')
      return jsonInvalidParameters('unsupported payload structure')
    }

    info(`Processing Prowlarr webhook: ${payload.eventType} for ${indexerName || 'unknown indexer'}`)

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

    info(`Sending notification email: ${subject}`)
    await sendNotification(subject, html)

    const duration = Date.now() - startTime
    info(`POST /api/webhooks/prowlarr - Success (${duration}ms)`, {
      eventType: payload.eventType,
      indexerName: variables.indexerName,
    })

    return {
      ...standardResponseSuccess({ source: 'prowlarr', eventType: payload.eventType }),
      status: 202,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`POST /api/webhooks/prowlarr - Error (${duration}ms):`, error)
    throw error
  }
})
