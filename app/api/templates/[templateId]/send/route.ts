import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { sendEmail } from '@/services/resend'
import { getTemplate, renderTemplate } from '@/services/templates/registry'

function requireEnv(key: string) {
  const value = process.env[key]
  if (!value) {
    throw new Error(`${key} is not configured`)
  }
  return value
}

export const runtime = 'nodejs'

export const POST = api(async (req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) => {
  if (!(await validateCookie())) {
    return jsonUnauthorized()
  }
  try {
    const { templateId } = await params
    const template = getTemplate(templateId)
    if (!template) {
      return { code: 404, message: 'template not found', status: 404 }
    }

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const to = typeof body?.to === 'string' ? body.to : undefined
    const variablesInput = body?.variables && typeof body.variables === 'object' ? body.variables : {}
    const variables = { ...template.defaultVariables, ...variablesInput }

    const html = renderTemplate(template.html, variables)

    const apiKey = requireEnv('RESEND_API_KEY')
    const from = requireEnv('NOTIFICATION_EMAIL_FROM')
    const defaultTo = requireEnv('NOTIFICATION_EMAIL_TO')

    const recipients = to || defaultTo
    const subject = `[Preview] ${template.name} - ${new Date().toLocaleString()}`

    const response = await sendEmail(apiKey, {
      from,
      to: recipients,
      subject,
      html,
    })

    return { code: 0, message: 'ok', data: response }
  } catch (error) {
    return { code: 500, message: error instanceof Error ? error.message : 'unknown error', status: 500 }
  }
})
