/**
 * Radarr movie add request payload
 */
export interface RadarrAddMovieRequest {
  /** TMDb ID of the movie */
  tmdbId: number
  /** Root folder path where the movie will be stored */
  rootFolderPath: string
  /** Quality profile ID */
  qualityProfileId: number
  /** Whether the movie should be monitored */
  monitored?: boolean
  /** Additional options for adding the movie */
  addOptions?: {
    /** Whether to search for the movie immediately */
    searchForMovie?: boolean
    /** Whether to ignore episodes with files */
    ignoreEpisodesWithFiles?: boolean
    /** Whether to ignore episodes without files */
    ignoreEpisodesWithoutFiles?: boolean
  }
  /** Minimum availability */
  minimumAvailability?: string
  /** Tags */
  tags?: number[]
}

/**
 * Radarr movie response
 */
export interface RadarrMovie {
  id?: number
  title: string
  sortTitle?: string
  status?: string
  overview?: string
  inCinemas?: string
  physicalRelease?: string
  digitalRelease?: string
  year?: number
  hasFile?: boolean
  monitored?: boolean
  tmdbId?: number
  imdbId?: string
  qualityProfileId?: number
  rootFolderPath?: string
  minimumAvailability?: string
  tags?: number[]
  addOptions?: {
    searchForMovie?: boolean
    ignoreEpisodesWithFiles?: boolean
    ignoreEpisodesWithoutFiles?: boolean
  }
}

/**
 * Radarr API error response
 */
export interface RadarrError {
  propertyName?: string
  errorMessage?: string
  attemptedValue?: any
  severity?: string
  errorCode?: string
}

/**
 * Radarr API response wrapper
 */
export interface RadarrResponse<T = any> {
  data?: T
  error?: RadarrError[]
}
