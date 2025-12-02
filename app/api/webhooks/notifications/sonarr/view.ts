import { fail } from '@/services/logger'
import { searchByTitle as searchTVDB } from '@/services/thetvdb'
import { hasTheTvdbApiKey } from '@/services/thetvdb/env'
import { searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'
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
  /** Formatted episode list HTML */
  episodeList: string
  /** Formatted release details HTML */
  releaseDetails: string
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
    episodeList,
    releaseDetails,
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
 * Format episode list as HTML for template
 * @param payload Sonarr webhook payload
 * @returns HTML string with episode list
 */
function formatEpisodeList(payload: SonarrWebhookPayload): string {
  const list = payload.episodes
    ?.map((episode) => {
      const code = formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)
      const name = escapeHtml(episode.title)
      const airDate = episode.airDateUtc || episode.airDate
      const dateStr = airDate ? ` · ${escapeHtml(airDate)}` : ''
      return `<div class="stack-item">${code} · ${name}${dateStr}</div>`
    })
    .join('')

  return list || '<div class="stack-item">No episode information available</div>'
}

/**
 * Format release details as HTML for template
 * @param release Release information from Sonarr
 * @returns HTML string with release details
 */
function formatReleaseDetails(release?: SonarrRelease): string {
  if (!release) {
    return ''
  }

  const items: string[] = []

  const qualityName = release.quality?.quality?.name
  const qualitySource = release.quality?.quality?.source
  const resolution = release.quality?.quality?.resolution
  if (qualityName || qualitySource || resolution) {
    const qualityText = [qualityName, qualitySource, resolution && `${resolution}p`].filter(Boolean).join(' / ')
    items.push(`<div class="stack-item">Quality: ${escapeHtml(qualityText)}</div>`)
  }

  if (release.releaseTitle) {
    items.push(`<div class="stack-item">Title: ${escapeHtml(release.releaseTitle)}</div>`)
  }

  if (release.releaseGroup) {
    items.push(`<div class="stack-item">Release Group: ${escapeHtml(release.releaseGroup)}</div>`)
  }

  const size = formatFileSize(release.size)
  if (size) {
    items.push(`<div class="stack-item">Size: ${escapeHtml(size)}</div>`)
  }

  if (release.indexer) {
    items.push(`<div class="stack-item">Indexer: ${escapeHtml(release.indexer)}</div>`)
  }

  return items.join('')
}

/**
 * Fetch series metadata (cover image, synopsis, detail URL) from TheTVDB or TMDB
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

  if (payload.series?.tvdbId) {
    detailUrl = `https://www.thetvdb.com/series/${payload.series.tvdbId}`
  }

  if (hasTheTvdbApiKey()) {
    try {
      const language = process.env.THE_TVDB_LANGUAGE ?? 'zh-CN'
      const results = await searchTVDB(seriesTitle, { language })
      if (results && results.length > 0) {
        const seriesResult = results[0]

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
        const tvResult = results.find((r) => r.media_type === 'tv') ?? results[0]

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
