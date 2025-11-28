import { fail, info, warn } from '@/services/logger'
import { request } from '@/services/request'
import { getTmdbApiKey } from '@/services/tmdb/env'

import { TMDB_API_BASE_URL } from './conf'
import type { SearchResult } from './types'

export interface SearchResponse {
  page: number
  results: SearchResult[]
  total_pages: number
  total_results: number
}

export interface SearchOptions {
  language?: string
  region?: string
}

export async function searchMulti(title: string, options: SearchOptions = {}): Promise<SearchResult[] | null> {
  const apiKey = getTmdbApiKey()

  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const region = options.region ?? process.env.TMDB_REGION

  try {
    info(`TMDB search start: ${title}`)

    const params = new URLSearchParams({
      api_key: apiKey,
      query: title,
      include_adult: 'false',
      language,
    })

    if (region) {
      params.set('region', region)
    }

    const apiUrl = `${TMDB_API_BASE_URL}/search/multi?${params.toString()}`
    const response = await request('GET', apiUrl)

    if (!response.ok) {
      fail(`TMDB search failed "${title}" status=${response.status} ${response.statusText}`)
      return null
    }

    const data = (await response.json()) as SearchResponse
    if (!(Array.isArray(data.results) && data.results.length > 0)) {
      warn(`TMDB search empty result for "${title}"`)
      return []
    }

    info(`TMDB search success: ${title}, results=${data.results.length}`)
    return data.results
  } catch (error) {
    fail(`TMDB search error for "${title}":`, error)
    return null
  }
}
