export interface Season {
  /** Season number */
  seasonNumber?: number
  /** Whether the season is monitored */
  monitored?: boolean
}

export type MovieId = string | number

export type MovieMediaType = 'series' | 'movie'

export interface Series {
  /** Title */
  title: string
  /** Chinese title */
  chineseTitle?: string
  /** Media type */
  mediaType?: MovieMediaType
  /** Year */
  year?: number
  /** thetvdb.com */
  tvdbId?: MovieId
  /** themoviedb.org */
  tmdbId?: MovieId
  /** imdb.com */
  imdbId?: MovieId
  /** douban.com (for tagging only) */
  doubanId?: MovieId
  /** Seasons */
  seasons?: Season[]
}

export type SeriesList = Series[]
