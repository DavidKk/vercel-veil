/**
 * Resend Email Service
 */

export interface ResendEmailOptions {
  from: string
  to: string | string[]
  subject: string
  html: string
  text?: string
  cc?: string | string[]
  bcc?: string | string[]
  reply_to?: string | string[]
  tags?: Array<{ name: string; value: string }>
}

export interface ResendResponse {
  id: string
  object: string
}

const RESEND_API_URL = 'https://api.resend.com/emails'

function ensureEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`${name} is not configured in environment variables`)
  }

  return value
}

export async function sendEmail(apiKey: string, options: ResendEmailOptions): Promise<ResendResponse> {
  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to send email: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = (await response.json()) as ResendResponse
  return data
}

export async function sendNotification(subject: string, html: string, to?: string | string[]) {
  const apiKey = ensureEnv('RESEND_API_KEY', process.env.RESEND_API_KEY)
  const defaultTo = ensureEnv('NOTIFICATION_EMAIL_TO', process.env.NOTIFICATION_EMAIL_TO)
  const from = ensureEnv('NOTIFICATION_EMAIL_FROM', process.env.NOTIFICATION_EMAIL_FROM)

  const recipients = to || parseRecipients(defaultTo)
  const options: ResendEmailOptions = {
    from,
    to: recipients,
    subject,
    html,
  }

  return sendEmail(apiKey, options)
}

function parseRecipients(value: string | string[]): string | string[] {
  if (Array.isArray(value)) {
    return value
  }

  if (value.includes(',')) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return value
}
