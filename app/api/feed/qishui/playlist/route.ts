import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters } from '@/initializer/response'
import { fail } from '@/services/logger'
import { fetchQishuiPlaylist } from '@/services/qishui'

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (typeof url !== 'string' || !url) {
    fail('Missing url parameter')
    return jsonInvalidParameters('url parameter is required')
  }

  try {
    const playlist = await fetchQishuiPlaylist(url)

    return NextResponse.json(playlist, {
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }),
    })
  } catch (error) {
    fail('Error fetching Qishui playlist:', error)
    return jsonInvalidParameters(error instanceof Error ? error.message : 'Failed to fetch playlist')
  }
})
