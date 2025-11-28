import { fail } from '@/services/logger'
import { searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'
import { escapeHtml, formatFileSize } from '@/utils/webhooks/format'

import type { RadarrRelease, RadarrWebhookPayload } from './types'

/**
 * Template variables for Radarr email notifications
 */
export interface RadarrTemplateVariables {
  /** Movie title */
  movieTitle: string
  /** Event type (e.g., Download, Upgrade) */
  eventType: string
  /** Localized action label in Chinese */
  actionLabel: string
  /** Release year */
  year: string
  /** Radarr instance name */
  instanceName: string
  /** Download client name */
  downloadClient: string
  /** Whether this is an upgrade (Yes/No) */
  isUpgrade: string
  /** Formatted release details HTML */
  releaseDetails: string
  /** Cover image URL */
  coverImage: string
  /** Movie synopsis/overview */
  synopsis: string
  /** Detail page URL */
  detailUrl: string
}

/**
 * Prepare template variables from Radarr webhook payload
 * @param payload Radarr webhook payload
 * @param preferredTitle Preferred movie title (from metadata service)
 * @returns Template variables ready for email rendering
 */
export async function prepareRadarrTemplateVariables(payload: RadarrWebhookPayload, preferredTitle?: string): Promise<RadarrTemplateVariables> {
  const movieTitle = preferredTitle ?? payload.movie?.title ?? payload.remoteMovie?.title ?? 'Unknown Movie'
  const eventType = payload.eventType ?? 'Unknown Event'
  const year = String(payload.movie?.year ?? payload.remoteMovie?.year ?? '')
  const instanceName = payload.instanceName ?? ''
  const downloadClient = payload.release?.downloadClient ?? payload.release?.downloadClientName ?? ''
  const isUpgrade = payload.isUpgrade ? 'Yes' : 'No'

  const actionLabel = getActionLabel(eventType)
  const releaseDetails = formatReleaseDetails(payload.release)
  const metadata = await getMovieMetadata(payload, movieTitle)

  return {
    movieTitle,
    eventType,
    actionLabel,
    year,
    instanceName,
    downloadClient,
    isUpgrade,
    releaseDetails,
    coverImage: metadata.coverImage,
    synopsis: metadata.synopsis,
    detailUrl: metadata.detailUrl,
  }
}

/**
 * Convert event type to localized Chinese label
 * @param eventType Event type string
 * @returns Localized label in Chinese
 */
function getActionLabel(eventType: string): string {
  const labels: Record<string, string> = {
    Test: '测试',
    Grab: '抓取',
    Download: '下载完成',
    MovieDelete: '删除电影',
    MovieFileDelete: '删除文件',
    Upgrade: '制品替换',
  }
  return labels[eventType] ?? eventType
}

/**
 * Format release details as HTML for template
 * @param release Release information from Radarr
 * @returns HTML string with release details
 */
function formatReleaseDetails(release?: RadarrRelease): string {
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

  const customFormats = release.customFormatInfo?.map((format) => escapeHtml(format.name ?? format.formatTag)).filter(Boolean)
  if (customFormats && customFormats.length) {
    items.push(`<div class="stack-item">Custom Formats: ${customFormats.join(', ')}</div>`)
  }

  if (typeof release.customFormatScore === 'number') {
    items.push(`<div class="stack-item">Format Score: ${escapeHtml(String(release.customFormatScore))}</div>`)
  }

  return items.join('')
}

/**
 * Fetch movie metadata (cover image, synopsis, detail URL) from TMDB
 * @param payload Radarr webhook payload
 * @param movieTitle Movie title to search for
 * @returns Movie metadata including cover image, synopsis, and detail URL
 */
async function getMovieMetadata(
  payload: RadarrWebhookPayload,
  movieTitle: string
): Promise<{
  coverImage: string
  synopsis: string
  detailUrl: string
}> {
  let coverImage = 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=960&q=80'
  let synopsis = payload.movie?.overview ?? ''
  let detailUrl = ''

  if (payload.movie?.tmdbId) {
    detailUrl = `https://www.themoviedb.org/movie/${payload.movie.tmdbId}`
  }

  if (hasTmdbApiKey()) {
    try {
      const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'
      const results = await searchMulti(movieTitle, { language })
      if (results && results.length > 0) {
        const movieResult = results.find((r) => r.media_type === 'movie') ?? results[0]

        if (movieResult.poster_path) {
          coverImage = `https://image.tmdb.org/t/p/w780${movieResult.poster_path}`
        }

        if (movieResult.overview) {
          synopsis = movieResult.overview
        }

        if (movieResult.id && movieResult.media_type === 'movie') {
          detailUrl = `https://www.themoviedb.org/movie/${movieResult.id}`
        }
      }
    } catch (error) {
      fail('Failed to fetch movie metadata from TMDB:', error)
    }
  }

  return {
    coverImage,
    synopsis: synopsis || 'No synopsis available',
    detailUrl: detailUrl || 'https://www.themoviedb.org',
  }
}

/**
 * Legacy function for rendering Radarr email (deprecated, use template system instead)
 * Kept for backward compatibility
 * @param payload Radarr webhook payload
 * @param preferredTitle Preferred movie title
 * @returns Email subject and HTML content
 * @deprecated Use prepareRadarrTemplateVariables with template system instead
 */
export function renderRadarrEmail(payload: RadarrWebhookPayload, preferredTitle?: string) {
  const movieTitle = preferredTitle ?? payload.movie?.title ?? payload.remoteMovie?.title ?? 'Unknown Movie'
  const eventLabel = payload.eventType ?? 'Unknown Event'

  const releaseDetails = renderReleaseDetails(payload.release)
  const year = payload.movie?.year ?? payload.remoteMovie?.year

  const subject = `[Radarr][${eventLabel}] ${movieTitle}${year ? ` (${year})` : ''}`
  const html = `
    <h2>Radarr Notification - ${escapeHtml(eventLabel)}</h2>
    <ul>
      <li><strong>Movie:</strong> ${escapeHtml(movieTitle)}</li>
      <li><strong>Year:</strong> ${escapeHtml(String(year ?? ''))}</li>
      <li><strong>Download Client:</strong> ${escapeHtml(payload.release?.downloadClient ?? payload.release?.downloadClientName ?? '')}</li>
      <li><strong>Upgrade:</strong> ${payload.isUpgrade ? 'Yes' : 'No'}</li>
      <li><strong>Instance:</strong> ${escapeHtml(payload.instanceName ?? '')}</li>
    </ul>
    ${releaseDetails}
  `

  return { subject, html }
}

/**
 * Legacy function for rendering release details (deprecated)
 * @param release Release information from Radarr
 * @returns HTML string with release details
 */
function renderReleaseDetails(release?: RadarrRelease) {
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
  const customFormats = release.customFormatInfo?.map((format) => escapeHtml(format.name ?? format.formatTag)).filter(Boolean)

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
  if (customFormats && customFormats.length) {
    items.push(`<li><strong>Custom Formats:</strong> ${customFormats.join(', ')}</li>`)
  }
  if (typeof release.customFormatScore === 'number') {
    items.push(`<li><strong>Format Score:</strong> ${escapeHtml(release.customFormatScore)}</li>`)
  }

  if (!(items.length > 0)) {
    return ''
  }

  return `
    <h3>Release</h3>
    <ul>${items.join('')}</ul>
  `
}
