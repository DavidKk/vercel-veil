'use server'

import { validateCookie } from '@/services/auth/access'
import { debug, fail, info } from '@/services/logger'
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

    const mergedVariables = { ...template.defaultVariables, ...variables }
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

    const mergedVariables = { ...template.defaultVariables, ...variables }

    debug(`Sending test email for template: ${templateId}`, {
      customRecipient: recipient || 'default',
      variableCount: Object.keys(variables).length,
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
