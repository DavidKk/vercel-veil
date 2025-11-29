import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { debug, fail, info } from '@/services/logger'
import { batchSearch } from '@/services/navidrome'
import { ensureApiAuthorized } from '@/utils/webhooks/auth'

export const runtime = 'nodejs'

export const POST = api(async (req: NextRequest) => {
  const startTime = Date.now()
  info('POST /api/music/batch-query - Request received')

  try {
    // Support cookie, header token, or Basic Auth (username/password)
    await ensureApiAuthorized(req)
    debug('API authenticated successfully')

    let body: any
    try {
      body = await req.json()
    } catch (error) {
      fail('Invalid JSON in request body:', error)
      return jsonInvalidParameters('Invalid JSON in request body')
    }

    const { queries } = body
    if (!Array.isArray(queries)) {
      fail('Invalid queries: must be an array')
      return jsonInvalidParameters('queries must be an array')
    }

    if (queries.length === 0) {
      fail('Invalid queries: array must not be empty')
      return jsonInvalidParameters('queries array must not be empty')
    }

    // Validate all queries are strings
    for (const query of queries) {
      if (typeof query !== 'string' || query.trim().length === 0) {
        fail(`Invalid query in array: ${query}`)
        return jsonInvalidParameters('All queries must be non-empty strings')
      }
    }

    info(`Batch searching music for ${queries.length} queries`)
    const results = await batchSearch(queries)

    const duration = Date.now() - startTime
    info(`POST /api/music/batch-query - Success (${duration}ms)`, {
      queryCount: queries.length,
      uniqueSongCount: results.songs.length,
    })

    return jsonSuccess(results, {
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`POST /api/music/batch-query - Error (${duration}ms):`, error)
    throw error
  }
})
