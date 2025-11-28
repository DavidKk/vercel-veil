export type MediaType = 'movie' | 'tv'

export interface BaseSearchResult {
  adult: boolean
  backdrop_path: string | null
  genre_ids: number[]
  id: number
  original_language: string
  overview: string
  popularity: number
  poster_path: string | null
  vote_average: number
  vote_count: number
  media_type: MediaType
}

export interface MovieSearchResult extends BaseSearchResult {
  media_type: 'movie'
  original_title: string
  release_date: string
  title: string
  video: boolean
}

export interface TVSearchResult extends BaseSearchResult {
  media_type: 'tv'
  name: string
  original_name: string
  first_air_date: string
  origin_country: string[]
}

export type SearchResult = MovieSearchResult | TVSearchResult
