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
 * Format anime title with Chinese title and season number
 */
export function formatAnimeTitle(anime: Anime): string {
  // Format: Japanese name (Chinese) if available, otherwise fallback to English/Romaji
  const primaryTitle = anime.title.native || anime.title.english || anime.title.romaji || 'Unknown'
  let title = primaryTitle
  // Add Chinese title in parentheses if available
  if (anime.title.chinese && anime.title.chinese !== primaryTitle) {
    title = `${primaryTitle}（${anime.title.chinese}）`
  }
  // Add season number if available
  if (anime.seasonNumber && anime.seasonNumber > 1) {
    title = `${title} 第${anime.seasonNumber}季`
  }
  return title
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
