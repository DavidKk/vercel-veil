import type { NextRequest } from 'next/server'

import { jsonUnauthorized } from '@/initializer/response'

export const TOKEN_HEADER_NAME = process.env.WEBHOOK_TOKEN_HEADER ?? 'x-vv-token'
const TOKEN_SECRET = process.env.WEBHOOK_TOKEN_SECRET

export function ensureAuthorized(req: NextRequest) {
  if (!TOKEN_SECRET) {
    throw new Error('WEBHOOK_TOKEN_SECRET is not configured in environment variables')
  }

  const token = getHeader(req.headers, TOKEN_HEADER_NAME)
  if (!token || token !== TOKEN_SECRET) {
    throw jsonUnauthorized('token mismatch')
  }
}

export function getHeader(headers: Headers, name: string): string | null {
  const normalized = name.toLowerCase()
  return headers.get(name) ?? headers.get(normalized) ?? headers.get(normalized.toUpperCase())
}
