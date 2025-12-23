/**
 * Convert FuzzyDateInt to YYYYMMDD format
 * @param date Date object
 * @returns YYYYMMDD format string (e.g., "20250115")
 */
export function formatFuzzyDateInt(date: Date): number {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return parseInt(`${year}${month}${day}`, 10)
}

/**
 * Extract TMDB ID from AniList externalLinks
 */
export function extractTmdbIdFromExternalLinks(externalLinks?: Array<{ id: number; url: string; site: string }> | null): number | undefined {
  if (!externalLinks || externalLinks.length === 0) {
    return undefined
  }

  const tmdbLink = externalLinks.find((link) => link.site === 'TMDB' || link.site === 'The Movie Database')
  if (!tmdbLink) {
    return undefined
  }

  // Extract ID from URL (e.g., "https://www.themoviedb.org/tv/12345" -> 12345)
  const match = tmdbLink.url.match(/\/(?:tv|movie)\/(\d+)/)
  if (match && match[1]) {
    const tmdbId = parseInt(match[1], 10)
    if (!isNaN(tmdbId)) {
      return tmdbId
    }
  }

  return undefined
}
