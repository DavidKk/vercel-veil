import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { plainText } from '@/initializer/controller'
import { textUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { getTemplate, renderTemplate } from '@/services/templates/registry'

export const runtime = 'nodejs'

export const GET = plainText(async (req: NextRequest, { params }: { params: Promise<{ templateId: string }> }) => {
  if (!(await validateCookie())) {
    return textUnauthorized()
  }

  const { templateId } = await params
  const template = getTemplate(templateId)
  if (!template) {
    return new NextResponse('Template not found', { status: 404 })
  }

  const url = new URL(req.url)
  const dataParam = url.searchParams.get('data')

  let variables = template.defaultVariables
  if (dataParam) {
    try {
      const jsonString = Buffer.from(decodeURIComponent(dataParam), 'base64').toString('utf-8')
      const parsed = JSON.parse(jsonString)
      if (typeof parsed === 'object' && parsed) {
        variables = { ...variables, ...parsed }
      }
    } catch (error) {
      return new NextResponse(`Invalid data payload: ${error}`, { status: 400 })
    }
  }

  const html = renderTemplate(template.html, variables)
  const headers = new Headers()
  headers.set('Content-Type', 'text/html; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new NextResponse(html, {
    status: 200,
    headers,
  })
})
