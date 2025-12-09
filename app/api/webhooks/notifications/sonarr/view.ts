import { fail } from '@/services/logger'
import { getSeriesById, searchByTitle as searchTVDB } from '@/services/thetvdb'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import type { Movie } from '@/services/thetvdb/types'
import { searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'
import type { SearchResult } from '@/services/tmdb/types'
import { escapeHtml, formatEpisodeCode, formatFileSize } from '@/utils/webhooks/format'

import type { SonarrRelease, SonarrWebhookPayload } from './types'

/**
 * Template variables for Sonarr email notifications
 */
export interface SonarrTemplateVariables {
  /** Series title */
  seriesTitle: string
  /** Event type (e.g., Download, Upgrade) */
  eventType: string
  /** Localized action label in Chinese */
  actionLabel: string
  /** Sonarr instance name */
  instanceName: string
  /** Download client name */
  downloadClient: string
  /** Whether this is an upgrade (Yes/No) */
  isUpgrade: string
  /** Formatted episode list as JSON array */
  episodeListJSON: string
  /** Formatted release details as JSON array */
  releaseDetailsJSON: string
  /** Cover image URL */
  coverImage: string
  /** Series synopsis/overview */
  synopsis: string
  /** Detail page URL */
  detailUrl: string
}

/**
 * Prepare template variables from Sonarr webhook payload
 * @param payload Sonarr webhook payload
 * @param preferredTitle Preferred series title (from metadata service)
 * @returns Template variables ready for email rendering
 */
export async function prepareSonarrTemplateVariables(payload: SonarrWebhookPayload, preferredTitle?: string): Promise<SonarrTemplateVariables> {
  const seriesTitle = preferredTitle ?? payload.series?.title ?? 'Unknown Series'
  const eventType = payload.eventType ?? 'Unknown Event'
  const instanceName = payload.instanceName ?? ''
  const downloadClient = payload.downloadClient ?? payload.downloadClientName ?? payload.release?.downloadClient ?? payload.release?.downloadClientName ?? ''
  const isUpgrade = payload.isUpgrade ? 'Yes' : 'No'

  const actionLabel = getActionLabel(eventType)
  const episodeList = formatEpisodeList(payload)
  const releaseDetails = formatReleaseDetails(payload.release)
  const metadata = await getSeriesMetadata(payload, seriesTitle)

  return {
    seriesTitle,
    eventType,
    actionLabel,
    instanceName,
    downloadClient,
    isUpgrade,
    episodeListJSON: JSON.stringify(episodeList),
    releaseDetailsJSON: JSON.stringify(releaseDetails),
    coverImage: metadata.coverImage,
    synopsis: metadata.synopsis,
    detailUrl: metadata.detailUrl,
  }
}

/**
 * Convert event type to localized label
 * @param eventType Event type string
 * @returns Localized label
 */
function getActionLabel(eventType: string): string {
  const labels: Record<string, string> = {
    Test: 'Test',
    Grab: 'Grab',
    Download: 'Download Complete',
    Upgrade: 'Upgrade',
    Rename: 'Rename',
    EpisodeFileDelete: 'Delete File',
    SeriesDelete: 'Delete Series',
  }
  return labels[eventType] ?? eventType
}

/**
 * Format episode list as data array for template
 * @param payload Sonarr webhook payload
 * @returns Array of episode objects with code, name, and airDate
 */
function formatEpisodeList(payload: SonarrWebhookPayload): Array<{ code: string; name: string; airDate: string }> {
  if (!payload.episodes || payload.episodes.length === 0) {
    return [{ code: '', name: 'No episode information available', airDate: '' }]
  }

  return payload.episodes.map((episode) => {
    const code = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)
    const name = episode.title || ''
    const airDate = episode.airDateUtc || episode.airDate || ''
    return { code, name, airDate }
  })
}

/**
 * Format release details as data array for template
 * @param release Release information from Sonarr
 * @returns Array of release detail objects with label and value
 */
function formatReleaseDetails(release?: SonarrRelease): Array<{ label: string; value: string }> {
  if (!release) {
    return []
  }

  const items: Array<{ label: string; value: string }> = []

  const qualityName = release.quality?.quality?.name
  const qualitySource = release.quality?.quality?.source
  const resolution = release.quality?.quality?.resolution
  if (qualityName || qualitySource || resolution) {
    const qualityText = [qualityName, qualitySource, resolution && `${resolution}p`].filter(Boolean).join(' / ')
    items.push({ label: 'Quality', value: qualityText })
  }

  if (release.releaseTitle) {
    items.push({ label: 'Title', value: release.releaseTitle })
  }

  if (release.releaseGroup) {
    items.push({ label: 'Release Group', value: release.releaseGroup })
  }

  const size = formatFileSize(release.size)
  if (size) {
    items.push({ label: 'Size', value: size })
  }

  if (release.indexer) {
    items.push({ label: 'Indexer', value: release.indexer })
  }

  return items
}

/**
 * Check if a series is live-action based on overview text
 * @param overview Series overview/synopsis text
 * @returns true if appears to be live-action
 */
function isLiveAction(overview: string): boolean {
  if (!overview) {
    return false
  }
  const lowerOverview = overview.toLowerCase()
  const liveActionKeywords = ['live-action', 'live action', '真人版', '真人', '実写', '実写版']
  return liveActionKeywords.some((keyword) => lowerOverview.includes(keyword))
}

/**
 * Filter TheTVDB search results to prefer anime/animation over live-action
 * @param results TheTVDB search results
 * @returns Filtered results, prioritizing non-live-action series
 */
function filterTheTVDBResults(results: Movie[]): Movie[] {
  if (!results || results.length === 0) {
    return []
  }

  // Priority 1: Filter by type (prefer 'series' over 'movie')
  const seriesResults = results.filter((r) => r.type === 'series')
  if (seriesResults.length === 0) {
    return results
  }

  // Priority 2: Filter out live-action based on overview
  const nonLiveActionResults = seriesResults.filter((r) => {
    const overview = r.overview || ''
    const overviews = r.overviews || {}
    // Check default overview and all language overviews
    const allOverviews = [overview, ...Object.values(overviews)].join(' ')
    return !isLiveAction(allOverviews)
  })

  // If we have non-live-action results, return them; otherwise return all series results
  return nonLiveActionResults.length > 0 ? nonLiveActionResults : seriesResults
}

/**
 * Filter TMDB search results to prefer anime/animation over live-action
 * @param results TMDB search results
 * @returns Filtered results, prioritizing non-live-action TV series
 */
function filterTMDBResults(results: SearchResult[]): SearchResult[] {
  if (!results || results.length === 0) {
    return []
  }

  // Priority 1: Filter by media_type (prefer 'tv' over 'movie')
  const tvResults = results.filter((r) => r.media_type === 'tv')
  if (tvResults.length === 0) {
    return results
  }

  // Priority 2: Prefer Animation genre (ID 16) - anime content
  const animationResults = tvResults.filter((r) => r.genre_ids && r.genre_ids.includes(16))
  if (animationResults.length > 0) {
    // Further filter out live-action from animation results
    const nonLiveActionAnimation = animationResults.filter((r) => !isLiveAction(r.overview || ''))
    if (nonLiveActionAnimation.length > 0) {
      return nonLiveActionAnimation
    }
    return animationResults
  }

  // Priority 3: Filter out live-action from all TV results
  const nonLiveActionResults = tvResults.filter((r) => !isLiveAction(r.overview || ''))
  return nonLiveActionResults.length > 0 ? nonLiveActionResults : tvResults
}

/**
 * Fetch series metadata (cover image, synopsis, detail URL) from TheTVDB or TMDB
 * Filters out live-action content to prefer anime/animation
 * @param payload Sonarr webhook payload
 * @param seriesTitle Series title to search for
 * @returns Series metadata including cover image, synopsis, and detail URL
 */
async function getSeriesMetadata(
  payload: SonarrWebhookPayload,
  seriesTitle: string
): Promise<{
  coverImage: string
  synopsis: string
  detailUrl: string
}> {
  let coverImage = 'https://images.unsplash.com/photo-1505685296765-3a2736de412f?auto=format&fit=crop&w=960&q=80'
  let synopsis = ''
  let detailUrl = ''

  // Priority 0: Check if payload already contains images
  // Sonarr webhook images array contains: coverType (poster/fanart/banner), url (local), remoteUrl (remote)
  if (payload.series?.images && Array.isArray(payload.series.images)) {
    const poster = payload.series.images.find((img) => img.coverType === 'poster' || img.coverType === 'posters')
    const fanart = payload.series.images.find((img) => img.coverType === 'fanart' || img.coverType === 'backgrounds')
    // Prefer remoteUrl (full URL) over url (local path)
    if (poster?.remoteUrl) {
      coverImage = poster.remoteUrl
    } else if (poster?.url && !poster.url.startsWith('/')) {
      // Only use url if it's not a local path
      coverImage = poster.url
    } else if (fanart?.remoteUrl) {
      coverImage = fanart.remoteUrl
    } else if (fanart?.url && !fanart.url.startsWith('/')) {
      coverImage = fanart.url
    }
  } else if (payload.series?.poster) {
    coverImage = payload.series.poster
  } else if (payload.series?.fanart) {
    coverImage = payload.series.fanart
  }

  // Priority 1: Use Sonarr's tvdbId if available (most accurate)
  if (payload.series?.tvdbId && hasTheTvdbApiKey()) {
    try {
      const seriesInfo = await getSeriesById(String(payload.series.tvdbId))
      if (seriesInfo) {
        detailUrl = `https://www.thetvdb.com/series/${payload.series.tvdbId}`

        // Use image from TheTVDB if not already set from payload
        if (!coverImage || coverImage.includes('unsplash.com')) {
          if (seriesInfo.imageUrl) {
            coverImage = seriesInfo.imageUrl
          }
        }

        // Use overview from TheTVDB
        if (seriesInfo.overviews) {
          synopsis = seriesInfo.overviews['zh-CN'] || seriesInfo.overviews['zh'] || seriesInfo.overviews['zh-Hans'] || seriesInfo.overviews['zh-Hant'] || seriesInfo.overview || ''
        } else if (seriesInfo.overview) {
          synopsis = seriesInfo.overview
        }

        // If we got everything from TheTVDB, return early
        if (coverImage && !coverImage.includes('unsplash.com') && synopsis) {
          return {
            coverImage,
            synopsis,
            detailUrl,
          }
        }
      }
    } catch (error) {
      fail(`Failed to fetch series by TVDB ID ${payload.series.tvdbId}:`, error)
    }
  }

  if (hasTheTvdbApiKey()) {
    try {
      const language = process.env.THE_TVDB_LANGUAGE ?? 'zh-CN'
      const results = await searchTVDB(seriesTitle, { language })
      if (results && results.length > 0) {
        // Filter results to prefer anime over live-action
        const filteredResults = filterTheTVDBResults(results)
        const seriesResult = filteredResults[0] || results[0]

        if (seriesResult.image_url) {
          coverImage = seriesResult.image_url
        }

        // Try to get Chinese overview first, then fallback to default overview
        if (seriesResult.overviews) {
          synopsis =
            seriesResult.overviews['zh-CN'] || seriesResult.overviews['zh'] || seriesResult.overviews['zh-Hans'] || seriesResult.overviews['zh-Hant'] || seriesResult.overview
        } else if (seriesResult.overview) {
          synopsis = seriesResult.overview
        }

        if (seriesResult.tvdb_id) {
          detailUrl = `https://www.thetvdb.com/series/${seriesResult.tvdb_id}`
        }
      }
    } catch (error) {
      fail('Failed to fetch series metadata from TheTVDB:', error)
    }
  }

  if (!synopsis && hasTmdbApiKey()) {
    try {
      const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'
      const results = await searchMulti(seriesTitle, { language })
      if (results && results.length > 0) {
        // Filter results to prefer anime over live-action
        const filteredResults = filterTMDBResults(results)
        const tvResult = filteredResults[0] || results.find((r) => r.media_type === 'tv') || results[0]

        if (tvResult.poster_path) {
          coverImage = `https://image.tmdb.org/t/p/w780${tvResult.poster_path}`
        }

        if (tvResult.overview) {
          synopsis = tvResult.overview
        }

        if (tvResult.id && tvResult.media_type === 'tv') {
          detailUrl = `https://www.themoviedb.org/tv/${tvResult.id}`
        }
      }
    } catch (error) {
      fail('Failed to fetch series metadata from TMDB:', error)
    }
  }

  return {
    coverImage,
    synopsis: synopsis || 'No synopsis available',
    detailUrl: detailUrl || 'https://www.thetvdb.com',
  }
}

/**
 * Legacy function for rendering Sonarr email (deprecated, use template system instead)
 * Kept for backward compatibility
 * @param payload Sonarr webhook payload
 * @param preferredTitle Preferred series title
 * @returns Email subject and HTML content
 * @deprecated Use prepareSonarrTemplateVariables with template system instead
 */
export function renderSonarrEmail(payload: SonarrWebhookPayload, preferredTitle?: string) {
  const seriesTitle = preferredTitle ?? payload.series?.title ?? 'Unknown Series'
  const eventLabel = payload.eventType ?? 'Unknown Event'

  const episodeList = renderEpisodeList(payload)
  const releaseDetails = renderReleaseDetails(payload.release)

  const subject = `[Sonarr][${eventLabel}] ${seriesTitle}`
  const html = `
    <h2>Sonarr Notification - ${escapeHtml(eventLabel)}</h2>
    <ul>
      <li><strong>Series:</strong> ${escapeHtml(seriesTitle)}</li>
      <li><strong>Download Client:</strong> ${escapeHtml(payload.downloadClient ?? payload.downloadClientName ?? '')}</li>
      <li><strong>Upgrade:</strong> ${payload.isUpgrade ? 'Yes' : 'No'}</li>
      <li><strong>Instance:</strong> ${escapeHtml(payload.instanceName ?? '')}</li>
    </ul>
    <h3>Episodes</h3>
    <ul>${episodeList}</ul>
    ${releaseDetails}
  `

  return { subject, html }
}

/**
 * Legacy function for rendering episode list (deprecated)
 * @param payload Sonarr webhook payload
 * @returns HTML string with episode list
 */
function renderEpisodeList(payload: SonarrWebhookPayload) {
  const list = payload.episodes
    ?.map((episode) => {
      const code = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)
      const name = escapeHtml(episode.title)
      const airDate = episode.airDateUtc || episode.airDate
      return `<li>${code} - ${name}${airDate ? ` <em>(${escapeHtml(airDate)})</em>` : ''}</li>`
    })
    .join('')

  return list || '<li>No episode information available</li>'
}

/**
 * Legacy function for rendering release details (deprecated)
 * @param release Release information from Sonarr
 * @returns HTML string with release details
 */
function renderReleaseDetails(release?: SonarrRelease) {
  if (!release) {
    return ''
  }

  const qualityName = release.quality?.quality?.name
  const qualitySource = release.quality?.quality?.source
  const resolution = release.quality?.quality?.resolution
  const releaseTitle = release.releaseTitle
  const releaseGroup = release.releaseGroup
  const size = formatFileSize(release.size)
  const indexer = release.indexer

  const items: string[] = []
  if (qualityName || qualitySource || resolution) {
    items.push(`<li><strong>Quality:</strong> ${escapeHtml([qualityName, qualitySource, resolution && `${resolution}p`].filter(Boolean).join(' / '))}</li>`)
  }
  if (releaseTitle) {
    items.push(`<li><strong>Title:</strong> ${escapeHtml(releaseTitle)}</li>`)
  }
  if (releaseGroup) {
    items.push(`<li><strong>Release Group:</strong> ${escapeHtml(releaseGroup)}</li>`)
  }
  if (size) {
    items.push(`<li><strong>Size:</strong> ${escapeHtml(size)}</li>`)
  }
  if (indexer) {
    items.push(`<li><strong>Indexer:</strong> ${escapeHtml(indexer)}</li>`)
  }

  if (!(items.length > 0)) {
    return ''
  }

  return `
    <h3>Release</h3>
    <ul>${items.join('')}</ul>
  `
}
