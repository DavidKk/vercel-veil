import { fetchJsonWithCache } from '@/services/fetch'
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

export interface SeriesResponse {
  status: string
  data: {
    id: string
    name: string
    slug: string
    image?: string
    nameTranslations?: string[]
    overviewTranslations?: string[]
    [key: string]: any
  }
}

/**
 * Get TV series information by TheTVDB ID
 * @param seriesId TheTVDB series ID
 * @param options Options for fetching series
 * @returns Series information or null if not found
 */
export async function getSeriesById(seriesId: string, options: SearchOptions = {}): Promise<{ name: string; translations?: Record<string, string> } | null> {
  const token = await getAccessToken()
  const language = options.language ?? process.env.THE_TVDB_LANGUAGE ?? 'zh-CN'

  const url = `${THETVDB.API_BASE_URL}/series/${seriesId}/extended`
  const headers = new Headers({
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  })
  if (language) {
    headers.set('Accept-Language', language)
  }

  try {
    info(`TVDB get series by ID: ${seriesId}`)
    const json = await fetchJsonWithCache<SeriesResponse>(url, {
      headers: Object.fromEntries(headers.entries()),
      cacheDuration: 60 * 1000, // 1 minute
    }).catch((error) => {
      fail(`TVDB get series failed for ID "${seriesId}":`, error)
      return null
    })

    if (!json) {
      return null
    }

    if (json.status !== 'success' || !json.data) {
      info(`TVDB response status not success for series ID "${seriesId}": ${json.status}`)
      return null
    }

    const series = json.data
    const result: { name: string; translations?: Record<string, string> } = {
      name: series.name,
    }

    // Extract translations if available
    if (series.nameTranslations && Array.isArray(series.nameTranslations)) {
      result.translations = {}
      // TheTVDB v4 API structure may vary, handle accordingly
      for (const translation of series.nameTranslations) {
        if (typeof translation === 'object' && translation !== null) {
          // Handle translation object structure
          const lang = (translation as any).language || (translation as any).lang
          const name = (translation as any).name || (translation as any).title
          if (lang && name) {
            result.translations[lang] = name
          }
        }
      }
    }

    info(`TVDB get series success: ID=${seriesId}, name=${series.name}`)
    return result
  } catch (error) {
    fail(`TVDB get series error for ID "${seriesId}":`, error)
    return null
  }
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
    const json = await fetchJsonWithCache<SearchResponse>(url.toString(), {
      headers: Object.fromEntries(headers.entries()),
      cacheDuration: 60 * 1000, // 1 minute
    }).catch((error) => {
      fail(`TVDB search failed "${title}":`, error)
      return null
    })

    if (!json) {
      return null
    }

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
