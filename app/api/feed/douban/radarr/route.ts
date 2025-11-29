import { XMLParser } from 'fast-xml-parser'
import type { NextRequest } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { type DoubanRSSDTO, extractSeriesListFromDoubanRSSDTO } from '@/services/douban'
import { debug, fail, info } from '@/services/logger'
import { ensureApiAuthorized } from '@/utils/webhooks/auth'

const RSS_HEADERS = {
  accept: 'application/xhtml+xml,application/xml;',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
}

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
  const startTime = Date.now()
  info('GET /api/feed/douban/radarr - Request received')

  try {
    // Support cookie, header token, or Basic Auth (username/password)
    await ensureApiAuthorized(req)
    debug('API authenticated successfully')

    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')
    debug(`RSS URL: ${url}`)

    if (typeof url !== 'string' || !url) {
      fail('Missing url parameter')
      return jsonInvalidParameters('url parameter is required')
    }

    info(`Fetching Douban RSS feed from: ${url}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: RSS_HEADERS,
    })

    if (!response.ok) {
      fail(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`)
      return jsonInvalidParameters(`HTTP error! status: ${response.status}`)
    }

    info('Parsing RSS XML...')
    const xmlText = await response.text()
    const parser = new XMLParser()
    const xmlDoc = parser.parse(xmlText) as DoubanRSSDTO

    info('Extracting movie list from Douban RSS...')
    const seriesList = await extractSeriesListFromDoubanRSSDTO(xmlDoc, { onlyMovie: true })
    const duration = Date.now() - startTime
    info(`GET /api/feed/douban/radarr - Success (${duration}ms)`, {
      movieCount: seriesList.length,
      url,
    })

    return jsonSuccess(seriesList, {
      headers: new Headers({
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      }),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    fail(`GET /api/feed/douban/radarr - Error (${duration}ms):`, error)
    throw error
  }
})
