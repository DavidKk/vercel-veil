import { fail, info, warn } from '@/services/logger'
import { searchByTitle as searchByTitleFromTheTVDB } from '@/services/thetvdb'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import { searchMulti as searchByTitleFromTMDB } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'
import type { SeriesList } from '@/types/feed'
import { chineseToNumber } from '@/utils/chineseToNumber'

import { RSS_HEADERS } from './constants'
import type { DoubanRSSDTO } from './types'

export * from './types'

/**
 * Fetch Douban RSS feed
 * @param url The URL of the Douban RSS feed
 * @returns Promise<Response> The fetch response object
 */
export async function fetchDoubanRSS(url: string): Promise<Response> {
  return fetch(url, {
    method: 'GET',
    headers: RSS_HEADERS,
  })
}

export interface ExtractSeriesListFromDoubanRSSDTOOptions {
  onlySeries?: boolean
  onlyMovie?: boolean
}

export async function extractSeriesListFromDoubanRSSDTO(dto: DoubanRSSDTO, options?: ExtractSeriesListFromDoubanRSSDTOOptions): Promise<SeriesList> {
  const { onlyMovie = false, onlySeries = false } = options || {}
  const items = dto.rss.channel.item
  if (!(Array.isArray(items) && items.length > 0)) {
    return []
  }

  let seriesies: SeriesList = Array.from(
    (function* () {
      for (const item of items) {
        const titleMatch = item.description.match(/title="(.*?)(?:第([零一二三四五六七八九十百千万亿]+?)季)?"/)
        const chineseTitleMatch = item.title.match(/^(?:想看|在看)(.*?)(?:第([零一二三四五六七八九十百千万亿]+?)季)?$/)
        const doubanIdMatch = item.link.match(/\/(\d+)\/$/)
        if (!(chineseTitleMatch && titleMatch)) {
          info(`Skipping item due to no title match: ${item.title}`)
          continue
        }

        const title = titleMatch[1].trim()
        const chineseTitle = chineseTitleMatch?.[1]?.trim() || title
        const seasonNumber = titleMatch[2] ? chineseToNumber(titleMatch[2]) : 1
        const season = { seasonNumber, monitored: true }

        let doubanId: number | undefined = parseInt((doubanIdMatch || [])[1])
        doubanId = isNaN(doubanId) ? undefined : doubanId

        info(`Extracted series: title=${title}, seasonNumber=${seasonNumber}, doubanId=${doubanId}`)

        yield {
          title,
          chineseTitle,
          doubanId: doubanId,
          seasons: [season],
        }
      }
    })()
  )

  info('Extracted series list from Douban RSS DTO:', seriesies)

  const useTMDB = hasTmdbApiKey()
  const useTheTVDB = hasTheTvdbApiKey()

  if (useTMDB) {
    await Promise.allSettled(
      seriesies.map(async (series) => {
        try {
          const { title } = series
          info(`Searching for series: ${title}`)
          const data = await searchByTitleFromTMDB(title)

          if (!(Array.isArray(data) && data.length > 0)) {
            info(`Not found any matching movies for: ${title}`)
            return series
          }

          const detail = data?.[0]
          const tmdbId = detail?.id
          const mediaType = detail?.media_type === 'movie' ? 'movie' : 'series'

          // Extract year from release_date (movie) or first_air_date (tv)
          let year: number | undefined
          if (detail?.media_type === 'movie' && 'release_date' in detail && detail.release_date) {
            const yearMatch = detail.release_date.match(/^(\d{4})/)
            if (yearMatch) {
              year = parseInt(yearMatch[1], 10)
            }
          } else if (detail?.media_type === 'tv' && 'first_air_date' in detail && detail.first_air_date) {
            const yearMatch = detail.first_air_date.match(/^(\d{4})/)
            if (yearMatch) {
              year = parseInt(yearMatch[1], 10)
            }
          }

          if (tmdbId) {
            info(`Found TMDB ID ${tmdbId} for series: ${title}`)
            series.tmdbId = tmdbId
            series.mediaType = mediaType
            if (year) {
              series.year = year
              info(`Found year ${year} for series: ${title}`)
            }
          } else {
            info(`No TMDB ID found for series: ${title}`)
          }
        } catch (error) {
          fail(`Something went wrong while processing series: ${series.title}, error: ${error}`)
        }

        return series
      })
    )
  } else if (useTheTVDB) {
    await Promise.allSettled(
      seriesies.map(async (series) => {
        try {
          const { title } = series
          info(`Searching for series: ${title}`)
          const data = await searchByTitleFromTheTVDB(title)
          if (!(Array.isArray(data) && data.length > 0)) {
            info(`Not found any matching movies for: ${title}`)
            return series
          }

          const detail = data?.[0]
          const tvdbid = detail?.tvdb_id
          const remoteIds = detail?.remote_ids || []
          const mediaType = detail?.type === 'movie' ? 'movie' : 'series'
          const imdbId = remoteIds.find((id) => id.sourceName === 'IMDB')?.id
          const tmdbId = remoteIds.find((id) => id.sourceName === 'TheMovieDB.com')?.id

          // Extract year from TheTVDB year field (string format)
          let year: number | undefined
          if (detail?.year) {
            const yearNum = parseInt(detail.year, 10)
            if (!isNaN(yearNum)) {
              year = yearNum
            }
          }

          if (tvdbid) {
            info(`Found TVDB ID ${tvdbid} for series: ${title}`)
            series.tvdbId = tvdbid
            series.mediaType = mediaType
            if (year) {
              series.year = year
              info(`Found year ${year} for series: ${title}`)
            }
          } else {
            info(`No TVDB ID found for series: ${title}`)
          }

          if (imdbId) {
            info(`Found IMDb ID ${imdbId} for series: ${title}`)
            series.imdbId = imdbId
          } else {
            info(`No IMDb ID found for series: ${title}`)
          }

          if (tmdbId) {
            info(`Found TMDB ID ${tmdbId} for series: ${title}`)
            series.tmdbId = tmdbId
          } else {
            info(`No TMDB ID found for series: ${title}`)
          }
        } catch (error) {
          fail(`Something went wrong while processing series: ${series.title}, error: ${error}`)
        }

        return series
      })
    )
  } else {
    warn('No API KEY found in environment, skipping series lookup.')
  }

  if (onlyMovie) {
    seriesies = seriesies.filter((series) => series.mediaType === 'movie')
  } else if (onlySeries) {
    seriesies = seriesies.filter((series) => series.mediaType === 'series')
  }

  info('Final series list with TVDB IDs:', seriesies)
  return seriesies
}
