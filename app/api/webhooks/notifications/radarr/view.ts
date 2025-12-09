import { fail } from '@/services/logger'
import { getMovieDetails, searchMulti } from '@/services/tmdb'
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
  /** Formatted release details as JSON array */
  releaseDetailsJSON: string
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
    MovieDelete: 'Delete Movie',
    MovieFileDelete: 'Delete File',
    Upgrade: 'Upgrade',
  }
  return labels[eventType] ?? eventType
}

/**
 * Format release details as data array for template
 * @param release Release information from Radarr
 * @returns Array of release detail objects with label and value
 */
function formatReleaseDetails(release?: RadarrRelease): Array<{ label: string; value: string }> {
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

  const customFormats = release.customFormatInfo?.map((format) => format.name ?? format.formatTag).filter(Boolean)
  if (customFormats && customFormats.length) {
    items.push({ label: 'Custom Formats', value: customFormats.join(', ') })
  }

  if (typeof release.customFormatScore === 'number') {
    items.push({ label: 'Format Score', value: String(release.customFormatScore) })
  }

  return items
}

/**
 * Fetch movie metadata (cover image, synopsis, detail URL) from TMDB
 * Prioritizes using payload images and direct ID lookup over search
 * @param payload Radarr webhook payload
 * @param movieTitle Movie title to search for (fallback if no ID available)
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

  // Priority 0: Check if payload already contains images
  // Radarr webhook images array contains: coverType (poster/fanart), url (may be local or remote)
  if (payload.movie?.images && Array.isArray(payload.movie.images)) {
    const poster = payload.movie.images.find((img) => img.coverType === 'poster' || img.coverType === 'posters')
    const fanart = payload.movie.images.find((img) => img.coverType === 'fanart' || img.coverType === 'backgrounds')
    // Prefer remoteUrl (full URL) over url (may be local path)
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
  } else if (payload.movie?.poster) {
    coverImage = payload.movie.poster
  } else if (payload.movie?.fanart) {
    coverImage = payload.movie.fanart
  }

  // Priority 1: Use Radarr's tmdbId if available (most accurate)
  if (payload.movie?.tmdbId && hasTmdbApiKey()) {
    try {
      const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'
      const movieDetails = await getMovieDetails(payload.movie.tmdbId, language)
      if (movieDetails) {
        detailUrl = `https://www.themoviedb.org/movie/${payload.movie.tmdbId}`

        // Use poster from TMDB if not already set from payload
        if (!coverImage || coverImage.includes('unsplash.com')) {
          if (movieDetails.poster_path) {
            coverImage = `https://image.tmdb.org/t/p/w780${movieDetails.poster_path}`
          } else if (movieDetails.backdrop_path) {
            coverImage = `https://image.tmdb.org/t/p/w780${movieDetails.backdrop_path}`
          }
        }

        // Use overview from TMDB if not already set
        if (!synopsis && movieDetails.overview) {
          synopsis = movieDetails.overview
        }

        // If we got everything from TMDB, return early
        if (coverImage && !coverImage.includes('unsplash.com') && synopsis) {
          return {
            coverImage,
            synopsis,
            detailUrl,
          }
        }
      }
    } catch (error) {
      fail(`Failed to fetch movie by TMDB ID ${payload.movie.tmdbId}:`, error)
    }
  }

  // Priority 2: Fallback to search if we don't have complete information
  if ((!coverImage || coverImage.includes('unsplash.com') || !synopsis) && hasTmdbApiKey()) {
    try {
      const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'
      const results = await searchMulti(movieTitle, { language })
      if (results && results.length > 0) {
        const movieResult = results.find((r) => r.media_type === 'movie') ?? results[0]

        // Use poster from search if not already set
        if (!coverImage || coverImage.includes('unsplash.com')) {
          if (movieResult.poster_path) {
            coverImage = `https://image.tmdb.org/t/p/w780${movieResult.poster_path}`
          }
        }

        // Use overview from search if not already set
        if (!synopsis && movieResult.overview) {
          synopsis = movieResult.overview
        }

        // Set detail URL if not already set
        if (!detailUrl && movieResult.id && movieResult.media_type === 'movie') {
          detailUrl = `https://www.themoviedb.org/movie/${movieResult.id}`
        }
      }
    } catch (error) {
      fail('Failed to fetch movie metadata from TMDB:', error)
    }
  }

  // Set detail URL from tmdbId if available but not set yet
  if (!detailUrl && payload.movie?.tmdbId) {
    detailUrl = `https://www.themoviedb.org/movie/${payload.movie.tmdbId}`
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
