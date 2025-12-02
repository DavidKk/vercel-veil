import { fail, info } from '@/services/logger'

import { THETVDB } from './constants'
import { getAccessToken } from './getAccessToken'
import type { Movie } from './types'

export interface SearchResponse {
  status: string
  data: Movie[]
}

export interface SearchOptions {
  language?: string
}

export async function searchByTitle(title: string, options: SearchOptions = {}): Promise<Movie[] | null> {
  const token = await getAccessToken()
  const language = options.language ?? process.env.THE_TVDB_LANGUAGE ?? 'zh-CN'

  const url = new URL(`${THETVDB.API_BASE_URL}/search`)
  url.searchParams.set('query', title)
  if (language) {
    url.searchParams.set('language', language)
  }

  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  })
  if (language) {
    headers.set('Accept-Language', language)
  }

  try {
    info(`TVDB search start: ${title}`)
    const response = await fetch(url.toString(), { headers })
    if (!response.ok) {
      fail(`TVDB search failed "${title}" status=${response.status} ${response.statusText}`)
      return null
    }

    const json = (await response.json()) as SearchResponse
    if (json.status !== 'success') {
      // Log but don't fail - TheTVDB may return non-success status for valid queries
      info(`TVDB response status not success for "${title}": ${json.status}`)
      return null
    }
    if (!Array.isArray(json.data) || json.data.length === 0) {
      // No results found - this is normal, not an error
      return null
    }

    info(`TVDB search success: ${title}, results=${json.data.length}`)
    return json.data
  } catch (error) {
    fail(`TVDB search error for "${title}":`, error)
    return null
  }
}
