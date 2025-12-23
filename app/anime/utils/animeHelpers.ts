import type { Anime } from '@/services/anilist/types'

/**
 * Get source badge text based on anime sources
 */
export function getSourceBadgeText(anime: Anime): string | null {
  if (anime.sources.length > 1) {
    return 'Both Lists'
  }
  return null
}

/**
 * Format start date as YYYY/MM/DD
 */
export function formatAnimeStartDate(startDate: { year?: number; month?: number; day?: number }): string | null {
  if (!startDate.year || !startDate.month || !startDate.day) {
    return null
  }
  const year = startDate.year
  const month = String(startDate.month).padStart(2, '0')
  const day = String(startDate.day).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * Get release info including status and formatted date
 */
export function getAnimeReleaseInfo(anime: Anime): { isReleased: boolean; formattedDate: string | null } | null {
  let isReleased: boolean | null = null

  // Check status first
  if (anime.status === 'RELEASING' || anime.status === 'FINISHED') {
    isReleased = true
  } else if (anime.status === 'NOT_YET_RELEASED') {
    isReleased = false
  }

  // Format startDate as YYYY/MM/DD
  const formattedDate = anime.startDate ? formatAnimeStartDate(anime.startDate) : null

  // If status is not clear, check startDate
  if (isReleased === null && anime.startDate?.year && anime.startDate?.month && anime.startDate?.day) {
    const startDate = new Date(anime.startDate.year, anime.startDate.month - 1, anime.startDate.day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    isReleased = startDate <= today
  }

  if (isReleased === null) return null

  return {
    isReleased,
    formattedDate: formattedDate || null,
  }
}

/**
 * Get detail page URL - prefer anilistId, fallback to tmdbId
 */
export function getAnimeDetailUrl(anime: Anime): string {
  return anime.anilistId ? `/anime/${anime.anilistId}` : `/anime/${anime.tmdbId}`
}

/**
 * Remove HTML tags from text
 */
export function stripHtml(html: string | undefined | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '')
}

/**
 * Clean description by removing HTML tags and empty lines
 */
export function cleanDescription(description: string | undefined | null): string {
  if (!description) return ''
  // Remove HTML tags
  const withoutHtml = stripHtml(description)
  // Split by lines, filter out empty lines (including lines with only whitespace), then join
  return withoutHtml
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')
}

/**
 * Check if two titles are similar (to avoid duplicate display)
 * Only exact matches are considered similar
 */
function areTitlesSimilar(title1: string, title2: string): boolean {
  if (!title1 || !title2) return false
  const t1 = title1.trim().toLowerCase()
  const t2 = title2.trim().toLowerCase()
  // Only exact match is considered similar
  // Note: "Title" and "Title Season 2" are considered different and both should be displayed
  return t1 === t2
}

/**
 * Format anime title with series root as main title and current entry as subtitle
 * Uses series root title (from relations) as primary title if available
 * Current entry title is shown as subtitle/part indicator
 */
export function formatAnimeTitle(anime: Anime): string {
  // If series root exists, use it as the main title
  if (anime.seriesRoot) {
    // Priority: Native > English > Romaji
    const rootTitle = anime.seriesRoot.title.native || anime.seriesRoot.title.english || anime.seriesRoot.title.romaji || 'Unknown'

    // Current entry title as subtitle (to show season/part info)
    const currentTitle = anime.title.native || anime.title.english || anime.title.romaji || ''

    // Only show current title if it's different from root title
    if (currentTitle && currentTitle !== rootTitle) {
      return `${rootTitle} - ${currentTitle}`
    }

    return rootTitle
  }

  // Fallback: use current entry title (no series root)
  // Priority: Native > English > Romaji
  const primaryTitle = anime.title.native || anime.title.english || anime.title.romaji || 'Unknown'
  return primaryTitle
}

/**
 * Check if a string contains Chinese characters
 */
function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text)
}

/**
 * Get associated title to display
 * Priority: TMDB/TVDB Chinese title > series root title > TMDB/TVDB non-Chinese title
 */
export function getAssociatedTitle(anime: Anime): string | null {
  const mainTitle = formatAnimeTitle(anime)

  // Priority 1: Check if TMDB/TVDB title exists and contains Chinese
  const tmdbTitle = anime.tmdbTitle
  const tvdbTitle = anime.tvdbTitle

  // Prefer Chinese title from TMDB/TVDB
  if (tmdbTitle && containsChinese(tmdbTitle) && !areTitlesSimilar(mainTitle, tmdbTitle)) {
    return tmdbTitle
  }
  if (tvdbTitle && containsChinese(tvdbTitle) && !areTitlesSimilar(mainTitle, tvdbTitle)) {
    return tvdbTitle
  }

  // Priority 2: Show series root title if exists
  if (anime.seriesRoot) {
    // Priority: Native > English > Romaji
    const seriesTitle = anime.seriesRoot.title.native || anime.seriesRoot.title.english || anime.seriesRoot.title.romaji
    if (seriesTitle && !areTitlesSimilar(mainTitle, seriesTitle)) {
      return seriesTitle
    }
  }

  // Priority 3: Show TMDB/TVDB title (non-Chinese) if exists and different from main title
  const associatedTitle = tmdbTitle || tvdbTitle
  if (associatedTitle && !areTitlesSimilar(mainTitle, associatedTitle)) {
    return associatedTitle
  }

  return null
}

/**
 * Filter anime that have score or popularity data
 */
export function filterAnimeWithScoreOrPopularity(anime: Anime[]): Anime[] {
  return anime.filter((item) => {
    const hasScore = item.averageScore !== undefined && item.averageScore > 0
    const hasPopularity = item.popularity !== undefined && item.popularity > 0
    return hasScore || hasPopularity
  })
}
