import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { fail } from '@/services/logger'
import { batchSearch } from '@/services/navidrome'
import { ensureApiAuthorized } from '@/utils/webhooks/auth'

export const runtime = 'nodejs'

export const POST = api(async (req: NextRequest) => {
  await ensureApiAuthorized(req)

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

  const results = await batchSearch(queries)

  return jsonSuccess(results, {
    headers: new Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    }),
  })
})
