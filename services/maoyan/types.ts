/**
 * Maoyan Movie API type definitions
 */

/** Top rated movies list response */
export interface TopRatedMoviesResponse {
  title: string
  movieList: MovieListItem[]
}

/** Top rated movie item */
export interface MovieListItem {
  movieId: number
  poster: string
  score: string
  name: string
}

/** Most expected movies list response */
export interface MostExpectedResponse {
  coming: ComingMovie[]
  paging: Paging
}

/** Most expected movie item */
export interface ComingMovie {
  id: number
  img: string
  wish: number
  wishst: number
  nm: string
  comingTitle: string
}

/** Pagination information */
export interface Paging {
  hasMore: boolean
  limit: number
  offset: number
  total: number
}

/** Merged movie data */
export interface MergedMovie {
  // Maoyan data
  maoyanId: number | string
  name: string
  poster: string
  score?: string
  wish?: number
  source: 'topRated' | 'mostExpected' | 'tmdbPopular' | 'tmdbUpcoming'
  sources: ('topRated' | 'mostExpected' | 'tmdbPopular' | 'tmdbUpcoming')[] // May appear in multiple lists
  maoyanUrl?: string // Maoyan movie detail page URL

  // TMDB data (obtained through search)
  tmdbId?: number
  tmdbPoster?: string
  overview?: string
  releaseDate?: string
  year?: number
  rating?: number
  tmdbUrl?: string
  genres?: string[] // Movie genres (e.g., Action, Comedy, Drama, etc.)
}
