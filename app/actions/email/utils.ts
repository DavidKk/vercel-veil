import type { MergedMovie } from '@/services/maoyan/types'

/**
 * Build movies data for email template
 * @param movies Array of movies to process
 * @param shareToken Share token for detail URLs
 * @param baseUrl Base URL for constructing detail URLs
 * @param limit Optional limit on number of movies (for preview)
 * @returns Array of movie data objects for template
 */
export function buildMoviesForTemplate(
  movies: MergedMovie[],
  shareToken: string,
  baseUrl: string,
  limit?: number
): Array<{
  poster: string
  name: string
  year: number | null
  score: string | null
  releaseDate: string | null
  genres: string[] | null
  maoyanUrl: string | null
  tmdbUrl: string | null
  detailUrl: string
}> {
  const moviesToProcess = limit ? movies.slice(0, limit) : movies

  return moviesToProcess.map((movie) => {
    // Build detail page URL - use share detail page URL with the same token
    const movieId = movie.tmdbId ? String(movie.tmdbId) : String(movie.maoyanId)
    const detailUrl = `${baseUrl}/movies/share/${shareToken}/${movieId}`

    return {
      poster: movie.tmdbPoster || movie.poster || 'https://via.placeholder.com/80x120?text=No+Image',
      name: movie.name || 'Unknown',
      year: movie.year || null,
      score: movie.score || null,
      releaseDate: movie.releaseDate || null,
      genres: movie.genres && movie.genres.length > 0 ? movie.genres : null,
      maoyanUrl: movie.maoyanUrl || null,
      tmdbUrl: movie.tmdbUrl || null,
      detailUrl,
    }
  })
}
