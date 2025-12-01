import { XMLParser } from 'fast-xml-parser'
import type { NextRequest } from 'next/server'

import { cron } from '@/initializer/controller'
import { jsonInvalidParameters, standardResponseSuccess } from '@/initializer/response'
import { type DoubanRSSDTO, extractSeriesListFromDoubanRSSDTO, fetchDoubanRSS } from '@/services/douban'
import { fail, info } from '@/services/logger'
import { hasTmdbAuth } from '@/services/tmdb/env'
import { syncMoviesToTMDBFavorites } from '@/services/tmdb/sync'

export const runtime = 'nodejs'

/**
 * Sync Douban movie list to TMDB favorites cron job
 * Called by Vercel Cron Jobs or manually with authentication
 * @param req Next.js request object
 * @returns Response with sync results
 */
export const GET = cron(async (req: NextRequest) => {
  // Check if TMDB auth is configured
  if (!hasTmdbAuth()) {
    return jsonInvalidParameters('TMDB authentication not configured. Please set TMDB_SESSION_ID environment variable.')
  }

  // Get Douban RSS URL from query parameter
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')

  if (typeof url !== 'string' || !url) {
    fail('Missing url query parameter')
    return jsonInvalidParameters('url query parameter is required (e.g., ?url=https://example.com/rss)')
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
