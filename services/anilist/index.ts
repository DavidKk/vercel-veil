import { fail, info } from '@/services/logger'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import { hasTmdbApiKey } from '@/services/tmdb/env'

import { convertAniListMediaToAnime } from './converter'
import { batchEnrichAnimeWithMetadata } from './enrichment'
import { executeGraphQLQuery } from './graphql'
import type { Anime } from './types'
import { formatFuzzyDateInt } from './utils'

/**
 * Fetch trending anime list (recently aired and trending)
 * Returns anime that started airing in the last month with rating >= 7.0
 */
export async function fetchTrendingAnime(options?: { page?: number; perPage?: number; noCache?: boolean }): Promise<Anime[]> {
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
          relations {
            edges {
              relationType
              node {
                id
                title {
                  romaji
                  english
                  native
                }
              }
            }
          }
          externalLinks {
            id
            url
            site
          }
        }
      }
    }
  `

  try {
    const data = await executeGraphQLQuery(
      query,
      {
        page,
        perPage,
        startDateGte,
        startDateLte,
      },
      { noCache: options?.noCache }
    )

    const anime = await Promise.all(data.Page.media.map((media) => convertAniListMediaToAnime(media, 'trending', { noCache: options?.noCache })))
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
export async function fetchUpcomingAnime(options?: { page?: number; perPage?: number; noCache?: boolean }): Promise<Anime[]> {
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
          relations {
            edges {
              relationType
              node {
                id
                title {
                  romaji
                  english
                  native
                }
              }
            }
          }
          externalLinks {
            id
            url
            site
          }
        }
      }
    }
  `

  try {
    const data = await executeGraphQLQuery(
      query,
      {
        page,
        perPage,
        startDateGte,
        startDateLte,
      },
      { noCache: options?.noCache }
    )

    const anime = await Promise.all(data.Page.media.map((media) => convertAniListMediaToAnime(media, 'upcoming', { noCache: options?.noCache })))
    info(`Fetched ${anime.length} upcoming anime from AniList`)
    return anime
  } catch (error) {
    fail('Failed to fetch upcoming anime from AniList:', error)
    throw error
  }
}

/**
 * Options for getting merged anime list
 */
export interface GetMergedAnimeListOptions {
  includeTrending?: boolean
  includeUpcoming?: boolean
  /** Disable cache (only works in development environment) */
  noCache?: boolean
  /** Limit the number of results returned (useful for development to reduce API requests) */
  limit?: number
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
  const noCache = options?.noCache

  if (includeTrending) {
    animePromises.push(fetchTrendingAnime({ noCache }))
  }

  if (includeUpcoming) {
    animePromises.push(fetchUpcomingAnime({ noCache }))
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

  // Apply limit if specified (useful for development to reduce API requests)
  if (options?.limit && options.limit > 0) {
    finalAnime = finalAnime.slice(0, options.limit)
    info(`Limited results to ${finalAnime.length} anime (limit=${options.limit})`)
  }

  // Enrich with TheTVDB data if available (for Chinese content)
  // Also try TMDB for favorites (tmdbId) if available
  if (hasTheTvdbApiKey() || hasTmdbApiKey()) {
    finalAnime = await batchEnrichAnimeWithMetadata(finalAnime)
  }

  return finalAnime
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
