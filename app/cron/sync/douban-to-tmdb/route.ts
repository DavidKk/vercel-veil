import { XMLParser } from 'fast-xml-parser'

import { cron } from '@/initializer/controller'
import { standardResponseSuccess } from '@/initializer/response'
import { type DoubanRSSDTO, extractSeriesListFromDoubanRSSDTO, fetchDoubanRSS } from '@/services/douban'
import { fail, info } from '@/services/logger'
import { hasTmdbAuth } from '@/services/tmdb/env'
import { syncMoviesToTMDBFavorites } from '@/services/tmdb/sync'

export const runtime = 'nodejs'

/**
 * Douban to TMDB sync cron job
 * Cron expression: 0 19 * * *
 * Executes at UTC 19:00 daily
 */
export const GET = cron(async () => {
  // Check if TMDB auth is configured
  if (!hasTmdbAuth()) {
    fail('TMDB authentication not configured. Please set TMDB_SESSION_ID environment variable.')
    return standardResponseSuccess()
  }

  // Get Douban RSS URL from environment variable
  const url = process.env.DOUBAN_RSS_URL

  if (!url || typeof url !== 'string') {
    fail('Missing DOUBAN_RSS_URL environment variable')
    return standardResponseSuccess()
  }

  info(`Syncing Douban list to TMDB favorites: ${url}`)

  // Fetch Douban RSS feed
  const response = await fetchDoubanRSS(url)

  if (!response.ok) {
    fail(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`)
    return standardResponseSuccess()
  }

  const xmlText = await response.text()
  const parser = new XMLParser()
  const xmlDoc = parser.parse(xmlText) as DoubanRSSDTO

  // Extract movie list (only movies, not TV series)
  const seriesList = await extractSeriesListFromDoubanRSSDTO(xmlDoc, { onlyMovie: true })

  // Filter only movies (not TV series)
  const movies = seriesList.filter((item) => item.mediaType === 'movie')

  if (movies.length === 0) {
    info('No movies found in Douban list')
    return standardResponseSuccess()
  }

  info(`Found ${movies.length} movies, syncing to TMDB favorites...`)

  // Sync movies to TMDB favorites (with search for missing IDs)
  const syncResult = await syncMoviesToTMDBFavorites(movies, { searchMissingIds: true })

  info(`Sync completed: ${syncResult.synced} newly synced, ${syncResult.skipped} already in favorites, ${syncResult.failed} failed out of ${syncResult.total} total`)

  return standardResponseSuccess()
})
