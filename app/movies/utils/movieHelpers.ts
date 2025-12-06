import type { MergedMovie } from '@/services/maoyan/types'

/**
 * Get source badge text based on movie sources
 */
export function getSourceBadgeText(movie: MergedMovie): string | null {
  if (movie.sources.length > 2) {
    return `${movie.sources.length} Sources`
  }
  if (movie.sources.length === 2) {
    return 'Both Lists'
  }
  return null
}

/**
 * Format release date as YYYY/MM/DD
 */
export function formatReleaseDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}/${month}/${day}`
}

/**
 * Get release info including status and formatted date
 */
export function getReleaseInfo(movie: MergedMovie): { isReleased: boolean; formattedDate: string } | null {
  if (!movie.releaseDate) return null

  const releaseDate = new Date(movie.releaseDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isReleased = releaseDate <= today

  return {
    isReleased,
    formattedDate: formatReleaseDate(releaseDate),
  }
}

/**
 * Get detail page URL - prefer tmdbId, fallback to maoyanId
 * If shareToken is provided, use share detail page URL
 */
export function getMovieDetailUrl(movie: MergedMovie, shareToken?: string): string {
  const movieId = movie.tmdbId ? String(movie.tmdbId) : String(movie.maoyanId)
  if (shareToken) {
    return `/movies/share/${shareToken}/${movieId}`
  }
  return `/movies/${movieId}`
}

/**
 * Filter movies that have rating or wish data
 */
export function filterMoviesWithRatingOrWish(movies: MergedMovie[]): MergedMovie[] {
  return movies.filter((movie) => {
    const hasRating = movie.rating !== undefined && movie.rating > 0
    const hasWish = movie.wish !== undefined && movie.wish > 0
    return hasRating || hasWish
  })
}
