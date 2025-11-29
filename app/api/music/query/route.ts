import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { fail } from '@/services/logger'
import { search } from '@/services/navidrome'
import { ensureApiAuthorized } from '@/utils/webhooks/auth'

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  await ensureApiAuthorized(req)

  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')

  if (typeof query !== 'string' || query.trim().length === 0) {
    fail('Invalid query parameter')
    return jsonInvalidParameters('query parameter (q) is required and must be a non-empty string')
  }

  const results = await search(query.trim())

  return jsonSuccess(results, {
    headers: new Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    }),
  })
})
