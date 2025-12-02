/**
 * AniList GraphQL API type definitions
 */

/** AniList media title */
export interface AniListTitle {
  romaji: string
  english?: string | null
  native?: string | null
}

/** AniList media cover image */
export interface AniListCoverImage {
  large?: string | null
  extraLarge?: string | null
}

/** AniList media start/end date */
export interface AniListFuzzyDate {
  year?: number | null
  month?: number | null
  day?: number | null
}

/** AniList studio */
export interface AniListStudio {
  nodes: Array<{
    name: string
  }>
}

/** AniList media item from GraphQL API */
export interface AniListMedia {
  id: number
  title: AniListTitle
  coverImage: AniListCoverImage | null
  bannerImage?: string | null
  description?: string | null
  averageScore?: number | null
  popularity?: number | null
  trending?: number | null
  status: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'
  format: 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC'
  episodes?: number | null
  duration?: number | null
  startDate: AniListFuzzyDate | null
  endDate: AniListFuzzyDate | null
  season?: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER' | null
  seasonYear?: number | null
  genres?: string[] | null
  studios: AniListStudio | null
  source?: 'ORIGINAL' | 'MANGA' | 'LIGHT_NOVEL' | 'VISUAL_NOVEL' | 'VIDEO_GAME' | 'OTHER' | null
  siteUrl: string
}

/** AniList GraphQL Page response */
export interface AniListPageResponse {
  Page: {
    media: AniListMedia[]
  }
}

/** Merged anime data */
export interface Anime {
  // AniList base data
  anilistId: number
  title: {
    romaji: string
    english?: string
    native?: string
    /** Chinese title (from TheTVDB/TMDB) */
    chinese?: string
  }
  coverImage?: string
  bannerImage?: string
  description?: string
  averageScore?: number
  popularity?: number
  trending?: number
  status: 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS'
  format: 'TV' | 'TV_SHORT' | 'MOVIE' | 'SPECIAL' | 'OVA' | 'ONA' | 'MUSIC'
  episodes?: number
  duration?: number
  startDate?: {
    year?: number
    month?: number
    day?: number
  }
  endDate?: {
    year?: number
    month?: number
    day?: number
  }
  season?: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER'
  seasonYear?: number
  /** Season number extracted from title or TheTVDB (e.g., 2 for "Season 2") */
  seasonNumber?: number
  genres?: string[]
  studios?: string[]
  /** Source type (MANGA, LIGHT_NOVEL, etc.) */
  sourceType?: string

  // Data source identifier
  source: 'trending' | 'upcoming'
  sources: ('trending' | 'upcoming')[]

  // AniList URL
  anilistUrl: string

  // TMDB data (optional, for Chinese content enrichment and favorites)
  tmdbId?: number
  tmdbUrl?: string
  /** TMDB poster image (may be better quality) */
  tmdbPoster?: string

  // Cache metadata
  insertedAt?: number
  updatedAt?: number
}
