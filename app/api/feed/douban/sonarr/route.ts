import { XMLParser } from 'fast-xml-parser'
import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { type DoubanRSSDTO, extractSeriesListFromDoubanRSSDTO } from '@/services/douban'
import { fail } from '@/services/logger'
import { ensureApiAuthorized } from '@/utils/webhooks/auth'

const RSS_HEADERS = {
  accept: 'application/xhtml+xml,application/xml;',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
}

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  try {
    await ensureApiAuthorized(req)

    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (typeof url !== 'string' || !url) {
      fail('Missing url parameter')
      return jsonInvalidParameters('url parameter is required')
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: RSS_HEADERS,
    })

    if (!response.ok) {
      fail(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`)
      return jsonInvalidParameters(`HTTP error! status: ${response.status}`)
    }

    const xmlText = await response.text()
    const parser = new XMLParser()
    const xmlDoc = parser.parse(xmlText) as DoubanRSSDTO

    const seriesList = await extractSeriesListFromDoubanRSSDTO(xmlDoc, { onlySeries: true })

    return jsonSuccess(seriesList, {
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }),
    })
  } catch (error) {
    fail('GET /api/feed/douban/sonarr - Error:', error)
    throw error
  }
})
