import { fail, info } from '@/services/logger'
import { getSeriesById } from '@/services/thetvdb'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import { getTVDetails, getTVExternalIds, searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'

import type { Anime } from './types'

/**
 * Check if should skip request based on retry markers
 * @param errorMarker Error marker - if true, retry on next request (don't skip)
 * @param noDataMarker No data marker - if true, check timestamp
 * @param noDataTimestamp No data timestamp - if exists and less than 24 hours ago, skip
 * @returns true if should skip, false if should retry
 */
function shouldSkipRequest(errorMarker?: boolean, noDataMarker?: boolean, noDataTimestamp?: number): boolean {
  // If error marker is set, retry on next request (don't skip)
  if (errorMarker) {
    return false
  }

  // If no data marker is set, check if 24 hours have passed
  if (noDataMarker && noDataTimestamp) {
    const now = Date.now()
    const oneDayInMs = 24 * 60 * 60 * 1000
    // If less than 24 hours ago, skip; otherwise retry
    return now - noDataTimestamp < oneDayInMs
  }

  return false
}

/**
 * Simple concurrency limiter
 */
async function limitConcurrency<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: unknown }>> {
  const results: Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: unknown }> = []
  const executing: Promise<void>[] = []

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const promise = (async () => {
      try {
        const value = await task()
        results[i] = { status: 'fulfilled', value }
      } catch (reason) {
        results[i] = { status: 'rejected', reason }
      }
    })()

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(
        executing.findIndex((p) => p === promise),
        1
      )
    }
  }

  await Promise.all(executing)
  return results
}

/**
 * Mark anime items with error marker
 */
function markError(items: Anime[], errorMarker: 'tmdbSearchError' | 'tmdbDetailsError' | 'tvdbDataError'): void {
  for (const item of items) {
    item[errorMarker] = true
    const noDataMarker = errorMarker.replace('Error', 'NoData') as 'tmdbSearchNoData' | 'tmdbDetailsNoData' | 'tvdbDataNoData'
    item[noDataMarker] = false
    const timestampKey = `${noDataMarker}Timestamp` as 'tmdbSearchNoDataTimestamp' | 'tmdbDetailsNoDataTimestamp' | 'tvdbDataNoDataTimestamp'
    delete item[timestampKey]
  }
}

/**
 * Mark anime items with no data marker and timestamp
 */
function markNoData(items: Anime[], noDataMarker: 'tmdbSearchNoData' | 'tmdbDetailsNoData' | 'tvdbDataNoData'): void {
  const now = Date.now()
  for (const item of items) {
    item[noDataMarker] = true
    const timestampKey = `${noDataMarker}Timestamp` as 'tmdbSearchNoDataTimestamp' | 'tmdbDetailsNoDataTimestamp' | 'tvdbDataNoDataTimestamp'
    item[timestampKey] = now
    const errorMarker = noDataMarker.replace('NoData', 'Error') as 'tmdbSearchError' | 'tmdbDetailsError' | 'tvdbDataError'
    item[errorMarker] = false
  }
}

/**
 * Clear retry markers on success
 */
function clearRetryMarkers(item: Anime, markerPrefix: 'tmdbSearch' | 'tmdbDetails' | 'tvdbData'): void {
  item[`${markerPrefix}Error` as 'tmdbSearchError' | 'tmdbDetailsError' | 'tvdbDataError'] = false
  item[`${markerPrefix}NoData` as 'tmdbSearchNoData' | 'tmdbDetailsNoData' | 'tvdbDataNoData'] = false
  delete item[`${markerPrefix}NoDataTimestamp` as 'tmdbSearchNoDataTimestamp' | 'tmdbDetailsNoDataTimestamp' | 'tvdbDataNoDataTimestamp']
}

/**
 * Batch enrich anime with metadata from TheTVDB and TMDB
 * Optimizes API calls by batching requests in stages:
 * Priority order:
 * 1. Use TMDB ID from AniList externalLinks (if available) - no search needed
 * 2. If no TMDB ID but has TVDB ID, get TVDB data by TVDB ID first
 * 3. If no TMDB ID and no TVDB ID, search TMDB by title (deduplicate and batch search)
 * 4. Get TMDB details (title and description) for all TMDB IDs
 * 5. If no TMDB data, get TVDB ID from TMDB External IDs
 * 6. If no TMDB data, get TVDB data by TVDB ID
 */
export async function batchEnrichAnimeWithMetadata(anime: Anime[]): Promise<Anime[]> {
  if (!hasTheTvdbApiKey() && !hasTmdbApiKey()) {
    return anime
  }

  const sources = []
  if (hasTheTvdbApiKey()) sources.push('TheTVDB')
  if (hasTmdbApiKey()) sources.push('TMDB')
  info(`Batch enriching ${anime.length} anime with ${sources.join(' + ')} data`)

  // Stage 1: Collect titles that need TMDB search (deduplicate by title)
  const titleSearchMap = new Map<string, Array<{ anime: Anime; title: string; index: number }>>()
  const tmdbIdMap = new Map<number, Anime[]>() // Map TMDB ID to anime items that need it

  for (let i = 0; i < anime.length; i++) {
    const item = anime[i]
    // Priority 1: If already has TMDB ID, skip search
    if (item.tmdbId) {
      const existing = tmdbIdMap.get(item.tmdbId) || []
      existing.push(item)
      tmdbIdMap.set(item.tmdbId, existing)
      continue
    }

    // Priority 2: If has TVDB ID but no TMDB ID, skip title search (will use TVDB data later)
    if (item.tvdbId) {
      continue
    }

    // Priority 3: If no TMDB ID and no TVDB ID, prepare for title search
    // Check if should skip TMDB search based on retry markers
    if (shouldSkipRequest(item.tmdbSearchError, item.tmdbSearchNoData, item.tmdbSearchNoDataTimestamp)) {
      continue
    }

    // Use series root title if available, otherwise use current entry title
    const titleSource = item.seriesRoot ? item.seriesRoot.title : item.title
    // Priority: English > Japanese (native/romaji), only use one title for search
    const searchTitle = titleSource.english || titleSource.native || titleSource.romaji

    if (searchTitle) {
      if (!titleSearchMap.has(searchTitle)) {
        titleSearchMap.set(searchTitle, [])
      }
      titleSearchMap.get(searchTitle)!.push({ anime: item, title: searchTitle, index: i })
    }
  }

  // Stage 1: Batch search TMDB (with concurrency limit)
  if (hasTmdbApiKey() && titleSearchMap.size > 0) {
    const searchTasks = Array.from(titleSearchMap.entries()).map(([title, items]) => async () => {
      try {
        // Use English for search (title may be English or Japanese, but search API works with English)
        const tmdbResults = await searchMulti(title, { language: 'en' })
        return { title, items, results: tmdbResults || [], error: null }
      } catch (error) {
        fail(`Error searching TMDB for "${title}":`, error)
        return { title, items, results: [], error }
      }
    })

    const searchResults = await limitConcurrency(searchTasks, 5) // Max 5 concurrent searches

    // Apply search results to anime items
    const titleSearchEntries = Array.from(titleSearchMap.entries())
    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i]
      const [, items] = titleSearchEntries[i] || ['', []]
      const animeItems = items.map(({ anime }) => anime)

      if (result.status === 'fulfilled' && result.value) {
        const { results: tmdbResults, error } = result.value

        // Handle error case
        if (error) {
          markError(animeItems, 'tmdbSearchError')
          continue
        }

        // Handle no data case
        if (!tmdbResults || tmdbResults.length === 0) {
          markNoData(animeItems, 'tmdbSearchNoData')
          continue
        }

        // Handle success case
        const tvResult = tmdbResults.find((r) => r.media_type === 'tv')
        if (tvResult?.id) {
          for (const item of animeItems) {
            if (!item.tmdbId) {
              item.tmdbId = tvResult.id
              // Set TMDB URL if not already set (may be set from externalLinks in converter)
              if (!item.tmdbUrl) {
                item.tmdbUrl = `https://www.themoviedb.org/tv/${tvResult.id}`
              }
              // Don't set title/description from search results (they are in English)
              // Will get Chinese title/description from details API later
              // Clear retry markers on success
              clearRetryMarkers(item, 'tmdbSearch')
              const existing = tmdbIdMap.get(tvResult.id) || []
              existing.push(item)
              tmdbIdMap.set(tvResult.id, existing)
            }
          }
        } else {
          // No TV result found - mark with timestamp
          markNoData(animeItems, 'tmdbSearchNoData')
        }
      } else if (result.status === 'rejected') {
        // Handle rejected promise - mark all items with error
        markError(animeItems, 'tmdbSearchError')
      }
    }
  }

  // Stage 2: Collect unique TMDB IDs and batch fetch external IDs
  // Update tmdbIdMap to include all anime with TMDB ID (including those found in Stage 1)
  for (const item of anime) {
    if (item.tmdbId) {
      const existing = tmdbIdMap.get(item.tmdbId) || []
      if (!existing.includes(item)) {
        existing.push(item)
        tmdbIdMap.set(item.tmdbId, existing)
      }
    }
  }

  const tvdbIdMap = new Map<number, Anime[]>() // Map TVDB ID to anime items that need it
  const uniqueTmdbIds = Array.from(tmdbIdMap.keys())

  // Stage 2a: Get TMDB details (Chinese title and description) for all TMDB IDs
  // Search stage only gets TMDB ID, so all TMDB IDs need details API to get Chinese data
  const tmdbIdsToFetch = uniqueTmdbIds.filter((tmdbId) => {
    const items = tmdbIdMap.get(tmdbId) || []
    // Check if any item should skip (if all items should skip, skip the entire request)
    return items.some((item) => !shouldSkipRequest(item.tmdbDetailsError, item.tmdbDetailsNoData, item.tmdbDetailsNoDataTimestamp))
  })

  if (hasTmdbApiKey() && tmdbIdsToFetch.length > 0) {
    const tmdbDetailTasks = tmdbIdsToFetch.map((tmdbId) => async () => {
      try {
        // Use Chinese to get Chinese title and description
        const zhData = await getTVDetails(tmdbId, 'zh-CN')
        const title = zhData?.name
        const description = zhData?.overview

        return { tmdbId, title, description, error: null }
      } catch (error) {
        fail(`Error getting TMDB details for TMDB ID ${tmdbId}:`, error)
        return { tmdbId, title: undefined, description: undefined, error }
      }
    })

    const tmdbDetailResults = await limitConcurrency(tmdbDetailTasks, 5) // Max 5 concurrent requests

    // Apply TMDB detail results to anime items
    for (let i = 0; i < tmdbDetailResults.length; i++) {
      const result = tmdbDetailResults[i]
      const tmdbId = tmdbIdsToFetch[i]
      const items = tmdbIdMap.get(tmdbId) || []

      if (result.status === 'fulfilled' && result.value) {
        const { title, description, error } = result.value

        // Handle error case
        if (error) {
          markError(items, 'tmdbDetailsError')
          continue
        }

        // Handle success case
        // Only set title/description if we have Chinese data (title or description)
        // If no Chinese data, don't set anything (will try TVDB later if needed)
        if (title || description) {
          for (const item of items) {
            // Only set if we have data (Chinese title or description)
            if (title && title.trim() !== '') {
              item.tmdbTitle = title
            }
            if (description && description.trim() !== '') {
              item.tmdbDescription = description
            }
            // Set TMDB URL if not already set (may be set from externalLinks in converter)
            if (!item.tmdbUrl && tmdbId) {
              item.tmdbUrl = `https://www.themoviedb.org/tv/${tmdbId}`
            }
            // Clear retry markers on success
            clearRetryMarkers(item, 'tmdbDetails')
          }
        } else {
          // No Chinese data found - mark with timestamp
          markNoData(items, 'tmdbDetailsNoData')
        }
      } else if (result.status === 'rejected') {
        // Handle rejected promise
        markError(items, 'tmdbDetailsError')
      }
    }
  }

  // Stage 2b: Get external IDs (including TVDB ID) for TMDB IDs that don't have TMDB data
  // Only get TVDB ID for anime that don't have TMDB title or description
  const tmdbIdsWithoutData = new Set<number>()
  for (const item of anime) {
    if (item.tmdbId && !item.tmdbTitle && !item.tmdbDescription) {
      tmdbIdsWithoutData.add(item.tmdbId)
    }
  }

  if (hasTmdbApiKey() && tmdbIdsWithoutData.size > 0) {
    const externalIdTasks = Array.from(tmdbIdsWithoutData).map((tmdbId) => async () => {
      try {
        const externalIds = await getTVExternalIds(tmdbId)
        return { tmdbId, externalIds }
      } catch (error) {
        fail(`Error getting TVDB ID from TMDB External IDs for TMDB ID ${tmdbId}:`, error)
        return { tmdbId, externalIds: null }
      }
    })

    const externalIdResults = await limitConcurrency(externalIdTasks, 5) // Max 5 concurrent requests

    // Apply external ID results to anime items (only for those without TMDB data)
    for (const result of externalIdResults) {
      if (result.status === 'fulfilled' && result.value) {
        const { tmdbId, externalIds } = result.value
        if (externalIds?.tvdb_id) {
          const items = tmdbIdMap.get(tmdbId) || []
          for (const item of items) {
            // Only set TVDB ID if item doesn't have TMDB data
            if (!item.tmdbTitle && !item.tmdbDescription && !item.tvdbId) {
              item.tvdbId = externalIds.tvdb_id
              item.tvdbUrl = `https://thetvdb.com/series/${externalIds.tvdb_id}`
              const existing = tvdbIdMap.get(externalIds.tvdb_id) || []
              existing.push(item)
              tvdbIdMap.set(externalIds.tvdb_id, existing)
            }
          }
        }
      }
    }
  }

  // Stage 3: Collect unique TVDB IDs and batch fetch TVDB data
  // Only fetch TVDB data for anime that don't have TMDB data
  // Update tvdbIdMap to include all anime with TVDB ID (but only those without TMDB data)
  for (const item of anime) {
    // Only include anime that have TVDB ID but no TMDB data
    if (item.tvdbId && !item.tmdbTitle && !item.tmdbDescription) {
      const existing = tvdbIdMap.get(item.tvdbId) || []
      if (!existing.includes(item)) {
        existing.push(item)
        tvdbIdMap.set(item.tvdbId, existing)
      }
    }
  }

  const uniqueTvdbIds = Array.from(tvdbIdMap.keys())

  // Only fetch TVDB data if we have TVDB IDs and the anime don't have TMDB data
  // Filter out TVDB IDs that should be skipped based on retry markers
  const tvdbIdsToFetch = uniqueTvdbIds.filter((tvdbId) => {
    const items = tvdbIdMap.get(tvdbId) || []
    // Check if any item should skip (if all items should skip, skip the entire request)
    return items.some((item) => !shouldSkipRequest(item.tvdbDataError, item.tvdbDataNoData, item.tvdbDataNoDataTimestamp))
  })

  if (hasTheTvdbApiKey() && tvdbIdsToFetch.length > 0) {
    const tvdbTasks = tvdbIdsToFetch.map((tvdbId) => async () => {
      try {
        const tvdbSeries = await getSeriesById(String(tvdbId), { language: 'zh-CN' })
        return { tvdbId, series: tvdbSeries, error: null }
      } catch (error) {
        fail(`Error getting TheTVDB data for TVDB ID ${tvdbId}:`, error)
        return { tvdbId, series: null, error }
      }
    })

    const tvdbResults = await limitConcurrency(tvdbTasks, 5) // Max 5 concurrent requests

    // Apply TVDB results to anime items (only for those without TMDB data)
    for (let i = 0; i < tvdbResults.length; i++) {
      const result = tvdbResults[i]
      const tvdbId = tvdbIdsToFetch[i]
      const items = tvdbIdMap.get(tvdbId) || []
      // Filter items that don't have TMDB data
      const itemsWithoutTmdbData = items.filter((item) => !item.tmdbTitle && !item.tmdbDescription)

      if (result.status === 'fulfilled' && result.value) {
        const { series, error } = result.value

        // Handle error case
        if (error) {
          markError(itemsWithoutTmdbData, 'tvdbDataError')
          continue
        }

        // Handle success case
        if (series) {
          for (const item of itemsWithoutTmdbData) {
            // Set TVDB URL if not already set
            if (!item.tvdbUrl) {
              item.tvdbUrl = `https://thetvdb.com/series/${tvdbId}`
            }
            // Save TVDB title and description to separate fields (only Chinese)
            // Only use Chinese data, if no Chinese data, don't set anything
            let hasData = false
            if (series.translations) {
              // Only get Chinese title
              const chineseTitle =
                series.translations['zho'] ||
                series.translations['zh-CN'] ||
                series.translations['zh'] ||
                series.translations['zh-Hans'] ||
                series.translations['zh-Hant'] ||
                series.translations['chi']
              if (chineseTitle && chineseTitle.trim() !== '') {
                item.tvdbTitle = chineseTitle
                hasData = true
                // Also update title.chinese if not already set
                if (!item.title.chinese) {
                  item.title.chinese = chineseTitle
                }
              }
            }

            if (series.overviews) {
              // Only get Chinese description
              const chineseDescription =
                series.overviews['zho'] ||
                series.overviews['zh-CN'] ||
                series.overviews['zh'] ||
                series.overviews['zh-Hans'] ||
                series.overviews['zh-Hant'] ||
                series.overviews['chi']
              if (chineseDescription && chineseDescription.trim() !== '') {
                item.tvdbDescription = chineseDescription
                hasData = true
              }
            }

            // Clear retry markers on success, or mark no data
            if (hasData) {
              clearRetryMarkers(item, 'tvdbData')
            } else {
              markNoData([item], 'tvdbDataNoData')
            }
          }
        } else {
          // No data found - mark with timestamp
          markNoData(itemsWithoutTmdbData, 'tvdbDataNoData')
        }
      } else if (result.status === 'rejected') {
        // Handle rejected promise
        markError(itemsWithoutTmdbData, 'tvdbDataError')
      }
    }
  }

  const enrichedWithContent = anime.filter((a) => a.description).length
  const enrichedWithFavorites = anime.filter((a) => a.tmdbId).length
  info(`Batch enrichment completed: ${enrichedWithContent}/${anime.length} anime enriched with content, ${enrichedWithFavorites}/${anime.length} with favorites support`)

  // Log detailed information for each anime
  for (const item of anime) {
    const hasTmdbId = !!item.tmdbId
    const hasTvdbId = !!item.tvdbId
    const tmdbIdStr = hasTmdbId ? `TMDB ID: ${item.tmdbId}` : 'TMDB ID: not found'
    const tvdbIdStr = hasTvdbId ? `TVDB ID: ${item.tvdbId}` : 'TVDB ID: not found'

    // Get series name or use current title
    let seriesName: string
    if (item.seriesRoot) {
      seriesName = item.seriesRoot.title.native || item.seriesRoot.title.english || item.seriesRoot.title.romaji || 'Unknown'
    } else {
      seriesName = item.title.native || item.title.english || item.title.romaji || 'Unknown'
    }

    // Get current title for display
    const currentTitle = item.title.native || item.title.english || item.title.romaji || 'Unknown'
    const titleInfo = item.title.english ? `Title: "${currentTitle}" (has English)` : `Title: "${currentTitle}" (no English)`

    info(`Anime [${item.anilistId}]: ${tmdbIdStr}, ${tvdbIdStr}, Series: "${seriesName}", ${titleInfo}`)
  }

  return anime
}
