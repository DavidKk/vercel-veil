import { XMLParser } from 'fast-xml-parser'

import { cron } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
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
    return jsonInvalidParameters('TMDB authentication not configured. Please set TMDB_SESSION_ID environment variable.')
  }

  // Get Douban RSS URL from environment variable
  const url = process.env.DOUBAN_RSS_URL

  if (!url || typeof url !== 'string') {
    fail('Missing DOUBAN_RSS_URL environment variable')
    return jsonInvalidParameters('DOUBAN_RSS_URL environment variable is required (e.g., https://www.douban.com/feed/people/148049852/interests)')
  }

  info(`Syncing Douban list to TMDB favorites: ${url}`)

  // Fetch Douban RSS feed
  const response = await fetchDoubanRSS(url)

  if (!response.ok) {
    fail(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`)
    return jsonInvalidParameters(`HTTP error! status: ${response.status}`)
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
    return standardResponseSuccess({
      message: 'No movies found in Douban list',
      synced: 0,
      failed: 0,
      total: 0,
    })
  }

  info(`Found ${movies.length} movies, syncing to TMDB favorites...`)

  // Sync movies to TMDB favorites (with search for missing IDs)
  const syncResult = await syncMoviesToTMDBFavorites(movies, { searchMissingIds: true })

  const failedMovies = syncResult.results
    .filter((r) => !r.success)
    .map((r) => ({
      title: r.title,
      tmdbId: r.tmdbId,
      error: r.error || 'Unknown error',
    }))

  info(`Sync completed: ${syncResult.synced} newly synced, ${syncResult.skipped} already in favorites, ${syncResult.failed} failed out of ${syncResult.total} total`)

  return standardResponseSuccess({
    success: true,
    message: `Synced ${syncResult.synced} new movies to TMDB favorites${syncResult.skipped > 0 ? `, ${syncResult.skipped} already in favorites` : ''}`,
    synced: syncResult.synced,
    skipped: syncResult.skipped,
    failed: syncResult.failed,
    total: syncResult.total,
    failedMovies: failedMovies.length > 0 ? failedMovies : undefined,
  })
})
