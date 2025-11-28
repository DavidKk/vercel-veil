import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonSuccess, jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { fetchTasiMarketSummary } from '@/services/finance/tasi'
import { ensureAuthorized } from '@/utils/webhooks/auth'

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  // Support both cookie authentication (for test page) and header token (for third-party)
  const hasCookie = await validateCookie()
  if (!hasCookie) {
    // Fallback to header token authentication
    try {
      ensureAuthorized(req)
    } catch (error) {
      // ensureAuthorized throws jsonUnauthorized on failure
      if (error && typeof error === 'object' && 'status' in error) {
        return error as any
      }
      return jsonUnauthorized()
    }
  }

  const data = await fetchTasiMarketSummary()
  return jsonSuccess(data, {
    headers: new Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    }),
  })
})
