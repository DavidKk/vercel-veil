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

/** AniList media relation */
export interface AniListMediaRelation {
  id: number
  type: 'ADAPTATION' | 'PREQUEL' | 'SEQUEL' | 'PARENT' | 'SIDE_STORY' | 'CHARACTER' | 'SUMMARY' | 'ALTERNATIVE' | 'SPIN_OFF' | 'OTHER' | 'SOURCE' | 'COMPILATION' | 'CONTAINS'
  relationType:
    | 'ADAPTATION'
    | 'PREQUEL'
    | 'SEQUEL'
    | 'PARENT'
    | 'SIDE_STORY'
    | 'CHARACTER'
    | 'SUMMARY'
    | 'ALTERNATIVE'
    | 'SPIN_OFF'
    | 'OTHER'
    | 'SOURCE'
    | 'COMPILATION'
    | 'CONTAINS'
  title: AniListTitle
}

/** AniList external link */
export interface AniListExternalLink {
  id: number
  url: string
  site: string
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
  relations?: {
    edges?: Array<{
      relationType:
        | 'ADAPTATION'
        | 'PREQUEL'
        | 'SEQUEL'
        | 'PARENT'
        | 'SIDE_STORY'
        | 'CHARACTER'
        | 'SUMMARY'
        | 'ALTERNATIVE'
        | 'SPIN_OFF'
        | 'OTHER'
        | 'SOURCE'
        | 'COMPILATION'
        | 'CONTAINS'
      node: {
        id: number
        title: AniListTitle
      }
    }> | null
  } | null
  externalLinks?: Array<AniListExternalLink> | null
}

/** AniList GraphQL Page response */
export interface AniListPageResponse {
  Page: {
    media: AniListMedia[]
  }
}

/** AniList GraphQL Media response (single media) */
export interface AniListMediaResponse {
  Media: AniListMedia | null
}

/** Series root information */
export interface SeriesRoot {
  anilistId: number
  title: {
    romaji: string
    english?: string
    native?: string
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
  genres?: string[]
  studios?: string[]
  /** Source type (MANGA, LIGHT_NOVEL, etc.) */
  sourceType?: string

  // Data source identifier
  source: 'trending' | 'upcoming'
  sources: ('trending' | 'upcoming')[]

  // AniList URL
  anilistUrl: string

  // Series root information (for grouping seasons/parts)
  /** Series root entry (the main series, not a season/part) */
  seriesRoot?: SeriesRoot

  // TMDB data (optional, for Chinese content enrichment and favorites)
  tmdbId?: number
  tmdbUrl?: string
  /** TMDB poster image (may be better quality) */
  tmdbPoster?: string
  /** TMDB title (Chinese > Japanese > English priority) */
  tmdbTitle?: string
  /** TMDB description (Chinese > Japanese > English priority) */
  tmdbDescription?: string
  /** TVDB ID (from TMDB External IDs) */
  tvdbId?: number
  /** TVDB URL */
  tvdbUrl?: string
  /** TVDB title (Chinese > Japanese > English priority) */
  tvdbTitle?: string
  /** TVDB description (Chinese > Japanese > English priority) */
  tvdbDescription?: string

  // Cache metadata
  insertedAt?: number
  updatedAt?: number

  // Enrichment retry markers
  /** TMDB search error marker - retry on next request */
  tmdbSearchError?: boolean
  /** TMDB search no data marker - retry after 24 hours */
  tmdbSearchNoData?: boolean
  /** TMDB search no data timestamp - when the no data was marked */
  tmdbSearchNoDataTimestamp?: number
  /** TMDB details error marker - retry on next request */
  tmdbDetailsError?: boolean
  /** TMDB details no data marker - retry after 24 hours */
  tmdbDetailsNoData?: boolean
  /** TMDB details no data timestamp - when the no data was marked */
  tmdbDetailsNoDataTimestamp?: number
  /** TVDB data error marker - retry on next request */
  tvdbDataError?: boolean
  /** TVDB data no data marker - retry after 24 hours */
  tvdbDataNoData?: boolean
  /** TVDB data no data timestamp - when the no data was marked */
  tvdbDataNoDataTimestamp?: number
}
