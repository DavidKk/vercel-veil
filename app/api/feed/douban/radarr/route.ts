import { XMLParser } from 'fast-xml-parser'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { api } from '@/initializer/controller'
import { jsonInvalidParameters } from '@/initializer/response'
import { type DoubanRSSDTO, extractSeriesListFromDoubanRSSDTO } from '@/services/douban'
import { fail } from '@/services/logger'

const RSS_HEADERS = {
  accept: 'application/xhtml+xml,application/xml;',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
}

export const runtime = 'nodejs'

export const GET = api(async (req: NextRequest) => {
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

  const seriesList = await extractSeriesListFromDoubanRSSDTO(xmlDoc, { onlyMovie: true })

  // Radarr custom import list requires specific format:
  // { id: number, rank: number, adult: number, title: string, tvdbid: any, imdb_id: string, mediatype: string, release_year: number }[]
  const radarrList = seriesList
    .filter((item) => item.mediaType === 'movie' && item.tmdbId)
    .map((item, index) => {
      const tmdbId = typeof item.tmdbId === 'number' ? item.tmdbId : parseInt(String(item.tmdbId), 10)
      const result: {
        id: number
        rank: number
        adult: number
        title: string
        tvdbid: any
        imdb_id: string
        mediatype: string
        release_year: number
      } = {
        id: tmdbId,
        rank: index + 1,
        adult: 0,
        title: item.title,
        tvdbid: item.tvdbId || null,
        imdb_id: item.imdbId ? String(item.imdbId) : '',
        mediatype: 'movie',
        release_year: item.year || 0,
      }
      return result
    })

  return NextResponse.json(radarrList, {
    headers: new Headers({
      'Content-Type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    }),
  })
})
