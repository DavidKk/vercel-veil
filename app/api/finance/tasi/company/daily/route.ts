import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonSuccess, jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'
import { fetchTasiCompaniesDaily } from '@/services/finance/tasi'
import { debug, fail, info } from '@/services/logger'
import { ensureAuthorized } from '@/utils/webhooks/auth'

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  const startTime = Date.now()
  info('GET /api/finance/tasi/company/daily - Request received')

  try {
    // Support both cookie authentication (for test page) and header token (for third-party)
    const hasCookie = await validateCookie()
    debug(`Authentication check: cookie=${hasCookie}`)
    if (!hasCookie) {
      // Fallback to header token authentication
      try {
        ensureAuthorized(req)
        debug('Authenticated via header token')
      } catch (error) {
        fail('Authentication failed:', error)
        // ensureAuthorized throws jsonUnauthorized on failure
        if (error && typeof error === 'object' && 'status' in error) {
          return error as any
        }
        return jsonUnauthorized()
      }
    } else {
      debug('Authenticated via cookie')
    }

    info('Fetching TASI companies daily data...')
    const data = await fetchTasiCompaniesDaily()
    const duration = Date.now() - startTime
    info(`GET /api/finance/tasi/company/daily - Success (${duration}ms)`, {
      recordCount: Array.isArray(data) ? data.length : 0,
    })

    return jsonSuccess(data, {
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`GET /api/finance/tasi/company/daily - Error (${duration}ms):`, error)
    throw error
  }
})
