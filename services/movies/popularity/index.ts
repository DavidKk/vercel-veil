import type { MergedMovie } from '@/services/maoyan/types'

import { judgeMovieHotStatusWithMaoyan } from './maoyan'
import { judgeMovieHotStatusWithTMDB } from './tmdb'
import { MovieHotStatus } from './types'

// Re-export types
export { MovieHotStatus } from './types'

/**
 * Parse release date safely
 * @param releaseDateString Release date string
 * @returns Parsed date or null if invalid
 */
function parseReleaseDate(releaseDateString: string | undefined): Date | null {
  if (!releaseDateString) return null
  try {
    const date = new Date(releaseDateString)
    // Check if date is valid
    if (isNaN(date.getTime())) return null
    return date
  } catch {
    return null
  }
}

/**
 * Compare dates by date part only (ignore time)
 * @param date1 First date
 * @param date2 Second date
 * @returns true if date1 is after date2 (by date only)
 */
function isDateAfter(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate())
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate())
  return d1 > d2
}

/**
 * Judge movie hot status based on release date, popularity, vote count, and rating
 * Prioritizes TMDB data, falls back to Maoyan data if TMDB data is not available
 * @param movie Movie data with release date, popularity, vote count, and rating
 * @returns Movie hot status level
 */
export function judgeMovieHotStatus(movie: MergedMovie): MovieHotStatus {
  const today = new Date()
  const releaseDate = parseReleaseDate(movie.releaseDate)

  // Check if TMDB data is available (has tmdbId and at least one of popularity, rating, or tmdbVoteCount)
  const hasTmdbData = movie.tmdbId !== undefined && (movie.popularity !== undefined || movie.rating !== undefined || movie.tmdbVoteCount !== undefined)

  if (hasTmdbData) {
    // Use TMDB data (priority)
    return judgeMovieHotStatusWithTMDB(movie, today, releaseDate, isDateAfter)
  } else {
    // Fallback to Maoyan data
    return judgeMovieHotStatusWithMaoyan(movie, today, releaseDate, isDateAfter)
  }
}

/**
 * Check if movie is highly anticipated
 * @param movie Movie data
 * @returns true if movie is highly anticipated
 */
export function isHighlyAnticipated(movie: MergedMovie): boolean {
  return judgeMovieHotStatus(movie) === MovieHotStatus.HIGHLY_ANTICIPATED
}

/**
 * Check if movie is very hot
 * @param movie Movie data
 * @returns true if movie is very hot
 */
export function isVeryHot(movie: MergedMovie): boolean {
  return judgeMovieHotStatus(movie) === MovieHotStatus.VERY_HOT
}

/**
 * Check if movie is hot (highly anticipated or very hot)
 * @param movie Movie data
 * @returns true if movie is hot (highly anticipated or very hot)
 */
export function isHot(movie: MergedMovie): boolean {
  const status = judgeMovieHotStatus(movie)
  return status === MovieHotStatus.HIGHLY_ANTICIPATED || status === MovieHotStatus.VERY_HOT
}

/**
 * Filter movies to only include hot movies (highly anticipated or very hot)
 * @param movies Array of movies to filter
 * @returns Filtered array containing only hot movies
 */
export function filterHotMovies(movies: MergedMovie[]): MergedMovie[] {
  return movies.filter(isHot)
}
