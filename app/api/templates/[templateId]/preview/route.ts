import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { plainText } from '@/initializer/controller'
import { textUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { debug, fail, info } from '@/services/logger'
import { getTemplate, renderTemplate } from '@/services/templates/registry'

export const runtime = 'nodejs'

export const GET = plainText(async (req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) => {
  const startTime = Date.now()
  const { templateId } = await params
  info(`GET /api/templates/${templateId}/preview - Request received`)

  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to template preview')
      return textUnauthorized()
    }

    const template = getTemplate(templateId)
    if (!template) {
      fail(`Template not found: ${templateId}`)
      return new NextResponse('Template not found', { status: 404 })
    }

    const url = new URL(req.url)
    const dataParam = url.searchParams.get('data')
    debug(`Template preview request: templateId=${templateId}, hasData=${!!dataParam}`)

    let variables = template.defaultVariables
    if (dataParam) {
      try {
        const jsonString = Buffer.from(decodeURIComponent(dataParam), 'base64').toString('utf-8')
        const parsed = JSON.parse(jsonString)
        if (typeof parsed === 'object' && parsed) {
          variables = { ...variables, ...parsed }
          debug(`Merged ${Object.keys(parsed).length} custom variables`)
        }
      } catch (error) {
        fail(`Invalid data payload for template ${templateId}:`, error)
        return new NextResponse(`Invalid data payload: ${error}`, { status: 400 })
      }
    }

    const html = renderTemplate(template.html, variables)
    const duration = Date.now() - startTime
    info(`GET /api/templates/${templateId}/preview - Success (${duration}ms)`, {
      templateId,
      variableCount: Object.keys(variables).length,
    })

    const headers = new Headers()
    headers.set('Content-Type', 'text/html; charset=utf-8')
    headers.set('Cache-Control', 'no-store')
    return new NextResponse(html, {
      status: 200,
      headers,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`GET /api/templates/${templateId}/preview - Error (${duration}ms):`, error)
    throw error
  }
})
