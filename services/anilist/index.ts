import { fetchJsonWithCache } from '@/services/fetch'
import { fail, info } from '@/services/logger'
import { searchByTitle } from '@/services/thetvdb'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import type { Movie as TheTVDBSeries } from '@/services/thetvdb/types'
import { searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'
import type { TVSearchResult } from '@/services/tmdb/types'

import { ANILIST } from './constants'
import { getAnilistAccessToken } from './env'
import type { AniListPageResponse, Anime } from './types'

/**
 * Convert FuzzyDateInt to YYYYMMDD format
 * @param date Date object
 * @returns YYYYMMDD format string (e.g., "20250115")
 */
function formatFuzzyDateInt(date: Date): number {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return parseInt(`${year}${month}${day}`, 10)
}

/**
 * Convert AniList media to Anime type
 */
function convertAniListMediaToAnime(media: AniListPageResponse['Page']['media'][0], source: 'trending' | 'upcoming'): Anime {
  const coverImage = media.coverImage?.extraLarge || media.coverImage?.large || undefined
  const studios = media.studios?.nodes?.map((s) => s.name) || []

  return {
    anilistId: media.id,
    title: {
      romaji: media.title.romaji,
      english: media.title.english || undefined,
      native: media.title.native || undefined,
    },
    coverImage,
    bannerImage: media.bannerImage || undefined,
    description: media.description || undefined,
    averageScore: media.averageScore || undefined,
    popularity: media.popularity || undefined,
    trending: media.trending || undefined,
    status: media.status,
    format: media.format,
    episodes: media.episodes || undefined,
    duration: media.duration || undefined,
    startDate: media.startDate
      ? {
          year: media.startDate.year || undefined,
          month: media.startDate.month || undefined,
          day: media.startDate.day || undefined,
        }
      : undefined,
    endDate: media.endDate
      ? {
          year: media.endDate.year || undefined,
          month: media.endDate.month || undefined,
          day: media.endDate.day || undefined,
        }
      : undefined,
    season: media.season || undefined,
    seasonYear: media.seasonYear || undefined,
    genres: media.genres || undefined,
    studios: studios.length > 0 ? studios : undefined,
    sourceType: media.source || undefined,
    source: source,
    sources: [source],
    anilistUrl: media.siteUrl,
  }
}

/**
 * Execute GraphQL query to AniList API
 */
async function executeGraphQLQuery(query: string, variables: Record<string, unknown>): Promise<AniListPageResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Add Authorization header if access token is configured (optional, for better rate limits)
  const accessToken = getAnilistAccessToken()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  // Note: fetchJsonWithCache handles POST requests by including body in cache key
  const data = await fetchJsonWithCache<{ data?: AniListPageResponse; errors?: Array<{ message: string }> }>(ANILIST.API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
    cacheDuration: 60 * 1000, // 1 minute
  })

  if (data.errors) {
    throw new Error(`AniList GraphQL errors: ${data.errors.map((e) => e.message).join(', ')}`)
  }

  if (!data.data) {
    throw new Error('AniList API: invalid response structure')
  }

  return data.data
}

/**
 * Fetch trending anime list (recently aired and trending)
 * Returns anime that started airing in the last month with rating >= 7.0
 */
export async function fetchTrendingAnime(options?: { page?: number; perPage?: number }): Promise<Anime[]> {
  const page = options?.page ?? 1
  const perPage = options?.perPage ?? 50

  // Calculate date range: 1 month ago to today
  const today = new Date()
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  const startDateGte = formatFuzzyDateInt(oneMonthAgo)
  const startDateLte = formatFuzzyDateInt(today)

  info(`Fetching trending anime from AniList (page=${page}, date range: ${startDateGte} to ${startDateLte})`)

  const query = `
    query TrendingAnime($page: Int, $perPage: Int, $startDateGte: FuzzyDateInt, $startDateLte: FuzzyDateInt) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME
          format: TV
          sort: TRENDING_DESC
          status_in: [RELEASING, FINISHED]
          averageScore_greater: 70
          startDate_greater: $startDateGte
          startDate_lesser: $startDateLte
        ) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          averageScore
          popularity
          trending
          status
          format
          episodes
          duration
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          season
          seasonYear
          genres
          studios {
            nodes {
              name
            }
          }
          source
          siteUrl
        }
      }
    }
  `

  try {
    const data = await executeGraphQLQuery(query, {
      page,
      perPage,
      startDateGte,
      startDateLte,
    })

    const anime = data.Page.media.map((media) => convertAniListMediaToAnime(media, 'trending'))
    info(`Fetched ${anime.length} trending anime from AniList`)
    return anime
  } catch (error) {
    fail('Failed to fetch trending anime from AniList:', error)
    throw error
  }
}

/**
 * Fetch upcoming anime list (scheduled to air in the next month)
 * Returns anime that will start airing in the next month
 */
export async function fetchUpcomingAnime(options?: { page?: number; perPage?: number }): Promise<Anime[]> {
  const page = options?.page ?? 1
  const perPage = options?.perPage ?? 50

  // Calculate date range: today to 1 month from now
  const today = new Date()
  const oneMonthLater = new Date()
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)

  const startDateGte = formatFuzzyDateInt(today)
  const startDateLte = formatFuzzyDateInt(oneMonthLater)

  info(`Fetching upcoming anime from AniList (page=${page}, date range: ${startDateGte} to ${startDateLte})`)

  const query = `
    query UpcomingAnime($page: Int, $perPage: Int, $startDateGte: FuzzyDateInt, $startDateLte: FuzzyDateInt) {
      Page(page: $page, perPage: $perPage) {
        media(
          type: ANIME
          format: TV
          sort: START_DATE
          status: NOT_YET_RELEASED
          startDate_greater: $startDateGte
          startDate_lesser: $startDateLte
        ) {
          id
          title {
            romaji
            english
            native
          }
          coverImage {
            large
            extraLarge
          }
          bannerImage
          description
          averageScore
          popularity
          trending
          status
          format
          episodes
          duration
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          season
          seasonYear
          genres
          studios {
            nodes {
              name
            }
          }
          source
          siteUrl
        }
      }
    }
  `

  try {
    const data = await executeGraphQLQuery(query, {
      page,
      perPage,
      startDateGte,
      startDateLte,
    })

    const anime = data.Page.media.map((media) => convertAniListMediaToAnime(media, 'upcoming'))
    info(`Fetched ${anime.length} upcoming anime from AniList`)
    return anime
  } catch (error) {
    fail('Failed to fetch upcoming anime from AniList:', error)
    throw error
  }
}

/**
 * Get merged anime list without request-level cache
 * Internal use for GIST cache system
 */
export async function getMergedAnimeListWithoutCache(options?: GetMergedAnimeListOptions): Promise<Anime[]> {
  info('Fetching and merging anime lists from AniList (no request cache)')

  const { includeTrending = true, includeUpcoming = true } = options || {}

  // Fetch anime lists without cache (use allSettled for graceful error handling)
  const animePromises: Promise<Anime[]>[] = []

  if (includeTrending) {
    animePromises.push(fetchTrendingAnime())
  }

  if (includeUpcoming) {
    animePromises.push(fetchUpcomingAnime())
  }

  const results = await Promise.allSettled(animePromises)

  const trending = includeTrending && results[0]?.status === 'fulfilled' ? (results[0] as PromiseFulfilledResult<Anime[]>).value : []
  const upcomingIndex = includeTrending ? 1 : 0
  const upcoming = includeUpcoming && results[upcomingIndex]?.status === 'fulfilled' ? (results[upcomingIndex] as PromiseFulfilledResult<Anime[]>).value : []

  if (includeTrending && results[0]?.status === 'rejected') {
    fail('Failed to fetch trending anime from AniList:', (results[0] as PromiseRejectedResult).reason)
  }
  if (includeUpcoming && results[upcomingIndex]?.status === 'rejected') {
    fail('Failed to fetch upcoming anime from AniList:', (results[upcomingIndex] as PromiseRejectedResult).reason)
  }

  // Merge anime by anilistId
  const animeMap = new Map<number, Anime>()

  // Process trending anime
  for (const item of trending) {
    const existing = animeMap.get(item.anilistId)
    if (existing) {
      // Merge sources
      if (!existing.sources.includes('trending')) {
        existing.sources.push('trending')
      }
      // Update with more complete data if available
      if (!existing.coverImage && item.coverImage) {
        existing.coverImage = item.coverImage
      }
    } else {
      animeMap.set(item.anilistId, item)
    }
  }

  // Process upcoming anime
  for (const item of upcoming) {
    const existing = animeMap.get(item.anilistId)
    if (existing) {
      // Merge sources
      if (!existing.sources.includes('upcoming')) {
        existing.sources.push('upcoming')
      }
      // Update with more complete data if available
      if (!existing.coverImage && item.coverImage) {
        existing.coverImage = item.coverImage
      }
    } else {
      animeMap.set(item.anilistId, item)
    }
  }

  let finalAnime = Array.from(animeMap.values())
  info(`Merged ${finalAnime.length} unique anime from AniList (${trending.length} trending + ${upcoming.length} upcoming)`)

  // Enrich with TheTVDB data if available (for Chinese content)
  // Also try TMDB for favorites (tmdbId) if available
  if (hasTheTvdbApiKey() || hasTmdbApiKey()) {
    finalAnime = await batchEnrichAnimeWithMetadata(finalAnime)
  }

  return finalAnime
}

/**
 * Enrich a single anime with metadata from TheTVDB (for Chinese content) and TMDB (for favorites)
 * Priority: TheTVDB for content, TMDB for favorites (tmdbId)
 */
async function enrichAnimeWithMetadata(anime: Anime): Promise<Anime> {
  // Priority: native (Japanese) > english > romaji
  // Native title is most accurate for Japanese anime, english is widely used in databases, romaji is fallback
  const searchTitles = [anime.title.native, anime.title.english, anime.title.romaji].filter((t): t is string => !!t)

  // Step 1: Try TheTVDB first (better for TV/anime, supports Chinese)
  if (hasTheTvdbApiKey()) {
    try {
      for (const searchTitle of searchTitles) {
        const tvdbResults = await searchByTitle(searchTitle, { language: 'zh-CN' })

        // searchByTitle returns null if no results or error, [] is not returned
        if (tvdbResults && tvdbResults.length > 0) {
          // Prefer series type results (filter out movies)
          const seriesResult = tvdbResults.find((r) => r.type === 'series') as TheTVDBSeries | undefined

          if (seriesResult) {
            // Debug: Log TheTVDB response data
            info(`TheTVDB data for "${searchTitle}":`, {
              name: seriesResult.name,
              tvdb_id: seriesResult.tvdb_id,
              overview: seriesResult.overview,
              overviews: seriesResult.overviews,
              primary_language: seriesResult.primary_language,
              translations: seriesResult.translations,
            })

            // Helper function to get text with priority: Chinese > English > Japanese
            // TheTVDB uses ISO 639-3 language codes (3 letters: zho, eng, jpn, etc.)
            const getTextWithPriority = (translations: Record<string, string> | undefined, defaultText?: string): string | undefined => {
              if (!translations) {
                return defaultText
              }

              // Priority 1: Chinese (zho > zh-CN > zh > zh-Hans > zh-Hant > chi)
              const chinese = translations['zho'] || translations['zh-CN'] || translations['zh'] || translations['zh-Hans'] || translations['zh-Hant'] || translations['chi']

              // Priority 2: English (eng > en > en-US > en-GB)
              const english = translations['eng'] || translations['en'] || translations['en-US'] || translations['en-GB']

              // Priority 3: Japanese (jpn > ja > ja-JP)
              const japanese = translations['jpn'] || translations['ja'] || translations['ja-JP']

              // Return in priority order
              return chinese || english || japanese || defaultText
            }

            // Update description with priority: Chinese > English > Japanese
            if (seriesResult.overviews) {
              const availableLangs = Object.keys(seriesResult.overviews)
              info(`Available overview languages: ${availableLangs.join(', ')}`)

              const description = getTextWithPriority(seriesResult.overviews, seriesResult.overview)
              if (description && description.trim() !== '') {
                info(`Selected description language for "${searchTitle}": ${description.substring(0, 50)}...`)
                anime.description = description
              } else {
                info(`No description found for "${searchTitle}" from TheTVDB`)
              }
            }

            /**
             * Extract season number from title
             * Supports various patterns: "Season 2", "S2", Chinese "第2期"/"第2季", "2nd Season", etc.
             */
            const extractSeasonNumber = (title: string): number | undefined => {
              const patterns = [
                /season\s+(\d+)/i, // "Season 2", "season 3"
                /\s+s(\d+)\s*/i, // "S2", "S03"
                /第(\d+)[期季]/u, // Chinese format: "第2期", "第2季"
                /(\d+)[nd|rd|th]\s+season/i, // "2nd Season", "3rd Season"
              ]

              for (const pattern of patterns) {
                const match = title.match(pattern)
                if (match && match[1]) {
                  return parseInt(match[1], 10)
                }
              }

              return undefined
            }

            // Update title with priority: Chinese > English > Japanese
            // Use translations object for title (TheTVDB provides translations with language codes)
            if (seriesResult.translations) {
              const availableTitleLangs = Object.keys(seriesResult.translations)
              info(`Available title languages: ${availableTitleLangs.join(', ')}`)

              const preferredTitle = getTextWithPriority(seriesResult.translations, seriesResult.name)
              if (preferredTitle && preferredTitle.trim() !== '') {
                // Check if it's Chinese (starts with zho or contains Chinese characters)
                const isChinese = seriesResult.translations['zho'] === preferredTitle || /[\u4e00-\u9fa5]/.test(preferredTitle)

                if (isChinese) {
                  // Store Chinese title
                  anime.title.chinese = preferredTitle
                  info(`Updated Chinese title for "${searchTitle}": ${preferredTitle}`)
                }
                // Note: We keep the original title structure, Chinese title will be used for display
              }

              // Extract season number from extended_title or name
              const seasonFromExtended = seriesResult.extended_title ? extractSeasonNumber(seriesResult.extended_title) : undefined
              const seasonFromName = seriesResult.name ? extractSeasonNumber(seriesResult.name) : undefined
              const seasonNumber = seasonFromExtended || seasonFromName

              if (seasonNumber) {
                anime.seasonNumber = seasonNumber
                info(`Extracted season number for "${searchTitle}": ${seasonNumber}`)
              }
            }

            // Also try to extract season number from original AniList titles if not found
            if (!anime.seasonNumber) {
              const seasonFromOriginal = extractSeasonNumber(anime.title.english || anime.title.romaji || anime.title.native || '')
              if (seasonFromOriginal) {
                anime.seasonNumber = seasonFromOriginal
                info(`Extracted season number from original title: ${seasonFromOriginal}`)
              }
            }

            // Found TheTVDB match, break to try TMDB for favorites
            break
          }
        }
      }
    } catch (error) {
      // Log error but continue - TheTVDB search failure shouldn't block the process
      fail(`Error searching TheTVDB for anime "${anime.title.english || anime.title.romaji}":`, error)
    }
  }

  // Step 2: Try TMDB for favorites (tmdbId) - may not find anime, but worth trying
  if (hasTmdbApiKey() && !anime.tmdbId) {
    try {
      for (const searchTitle of searchTitles) {
        const tmdbResults = await searchMulti(searchTitle, { language: 'zh-CN' })

        if (tmdbResults && tmdbResults.length > 0) {
          // Prefer TV type results
          const tvResult = tmdbResults.find((r) => r.media_type === 'tv') as TVSearchResult | undefined

          if (tvResult?.id) {
            anime.tmdbId = tvResult.id
            // Found TMDB match, break
            break
          }
        }
      }
    } catch (error) {
      fail(`Error searching TMDB for anime "${anime.title.english || anime.title.romaji}":`, error)
    }
  }

  return anime
}

/**
 * Batch enrich anime with metadata from TheTVDB and TMDB
 * Optimizes API calls by batching requests
 */
async function batchEnrichAnimeWithMetadata(anime: Anime[]): Promise<Anime[]> {
  if (!hasTheTvdbApiKey() && !hasTmdbApiKey()) {
    return anime
  }

  const sources = []
  if (hasTheTvdbApiKey()) sources.push('TheTVDB')
  if (hasTmdbApiKey()) sources.push('TMDB')
  info(`Batch enriching ${anime.length} anime with ${sources.join(' + ')} data`)

  // Batch search all anime in parallel
  const searchResults = await Promise.allSettled(anime.map((item) => enrichAnimeWithMetadata(item)))

  // Process search results
  const enrichedAnime: Anime[] = []
  for (let i = 0; i < searchResults.length; i++) {
    const result = searchResults[i]
    if (result.status === 'fulfilled') {
      enrichedAnime.push(result.value)
    } else {
      enrichedAnime.push(anime[i])
    }
  }

  const enrichedWithContent = enrichedAnime.filter((a) => a.description).length
  const enrichedWithFavorites = enrichedAnime.filter((a) => a.tmdbId).length
  info(`Batch enrichment completed: ${enrichedWithContent}/${anime.length} anime enriched with content, ${enrichedWithFavorites}/${anime.length} with favorites support`)
  return enrichedAnime
}

/**
 * Options for getting merged anime list
 */
export interface GetMergedAnimeListOptions {
  includeTrending?: boolean
  includeUpcoming?: boolean
}

/**
 * Get merged anime list
 * Results are cached according to ANILIST_CACHE to reduce API requests
 */
export async function getMergedAnimeList(options?: GetMergedAnimeListOptions): Promise<Anime[]> {
  // For now, use the non-cached version
  // TODO: Implement request-level caching if needed
  return getMergedAnimeListWithoutCache(options)
}
