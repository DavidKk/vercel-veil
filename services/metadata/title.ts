import { searchByTitle as searchTVDB } from '@/services/thetvdb'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import { searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'
import type { MediaType, SearchResult } from '@/services/tmdb/types'

export type MetadataMediaType = 'movie' | 'series'

export interface TitleLookupOptions {
  defaultTitle?: string
  mediaType?: MetadataMediaType
  language?: string
}

export async function resolvePreferredTitle(options: TitleLookupOptions): Promise<string | undefined> {
  const { defaultTitle, mediaType = 'series' } = options
  if (!defaultTitle) {
    return undefined
  }

  const language = options.language ?? process.env.PREFERRED_METADATA_LANGUAGE ?? 'zh-CN'

  if (hasTmdbApiKey()) {
    const tmdbResults = await searchMulti(defaultTitle, { language }).catch(() => null)
    const tmdbMatch = selectTmdbResult(tmdbResults, mediaType)
    const tmdbTitle = tmdbMatch && pickTmdbTitle(tmdbMatch)
    if (tmdbTitle) {
      return tmdbTitle
    }
  }

  if (hasTheTvdbApiKey()) {
    const tvdbResults = await searchTVDB(defaultTitle, { language }).catch(() => null)
    if (Array.isArray(tvdbResults) && tvdbResults.length > 0) {
      const targetLanguage = language.toLowerCase()
      const match = tvdbResults[0]
      const translations = match.translations || {}
      const translated = translations[targetLanguage]
      if (translated) {
        return translated
      }

      if (match.name) {
        return match.name
      }
    }
  }

  return undefined
}

function selectTmdbResult(results: SearchResult[] | null | undefined, mediaType: MetadataMediaType) {
  if (!(Array.isArray(results) && results.length > 0)) {
    return undefined
  }

  const targetMediaType: MediaType = mediaType === 'movie' ? 'movie' : 'tv'
  return results.find((result) => result.media_type === targetMediaType) ?? results[0]
}

function pickTmdbTitle(result: SearchResult) {
  if (result.media_type === 'movie') {
    return result.title || result.original_title
  }

  return result.name || result.original_name
}
