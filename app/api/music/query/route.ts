import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { debug, fail, info } from '@/services/logger'
import { search } from '@/services/navidrome'
import { ensureApiAuthorized } from '@/utils/webhooks/auth'

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  const startTime = Date.now()
  info('GET /api/music/query - Request received')

  try {
    // Support cookie, header token, or Basic Auth (username/password)
    await ensureApiAuthorized(req)
    debug('API authenticated successfully')

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (typeof query !== 'string' || query.trim().length === 0) {
      fail('Invalid query parameter')
      return jsonInvalidParameters('query parameter (q) is required and must be a non-empty string')
    }

    info(`Searching music for: ${query}`)
    const results = await search(query.trim())

    const duration = Date.now() - startTime
    info(`GET /api/music/query - Success (${duration}ms)`, {
      query,
      resultCount: results.length,
    })

    return jsonSuccess(results, {
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`GET /api/music/query - Error (${duration}ms):`, error)
    throw error
  }
})
