import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { ensureApiAuthorized } from '@/services/auth/api'
import { checkCloudflareBlocked, checkServiceBlocked } from '@/services/cloudflare'
import { fail } from '@/services/logger'

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  await ensureApiAuthorized(req)

  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  const service = searchParams.get('service') // 'navidrome' | 'radarr' | null

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    fail('Invalid URL parameter for Cloudflare test')
    return jsonInvalidParameters('URL parameter is required and must be a non-empty string')
  }

  try {
    let result

    // If service is specified, use checkServiceBlocked
    if (service === 'navidrome' || service === 'radarr') {
      result = await checkServiceBlocked(url.trim(), {
        method: 'GET',
        checkBody: true,
      })
    } else {
      // Otherwise use general checkCloudflareBlocked
      result = await checkCloudflareBlocked(url.trim(), {
        method: 'GET',
        checkBody: true,
      })
    }

    return jsonSuccess(result)
  } catch (error) {
    fail('Cloudflare test failed', error)
    return jsonInvalidParameters(error instanceof Error ? error.message : 'Unknown error occurred')
  }
})
