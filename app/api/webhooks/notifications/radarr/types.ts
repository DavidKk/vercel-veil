export type RadarrEventType = 'Test' | 'Grab' | 'Download' | 'MovieDelete' | 'MovieFileDelete' | string

export interface RadarrMovie {
  id?: number
  title: string
  sortTitle?: string
  sizeOnDisk?: number
  overview?: string
  inCinemas?: string
  physicalRelease?: string
  year?: number
  tmdbId?: number
  imdbId?: string
  tvdbId?: number
  // Optional image fields that may be included in webhook payload
  // Radarr webhook images: coverType (poster/fanart), url (may be local or remote), remoteUrl (full URL if available)
  images?: Array<{
    coverType?: string
    url?: string
    remoteUrl?: string
  }>
  poster?: string
  fanart?: string
}

export interface RadarrQuality {
  quality?: {
    name?: string
    source?: string
    resolution?: number
  }
  revision?: {
    version?: number
    real?: number
    isRepack?: boolean
  }
}

export interface RadarrRelease {
  quality?: RadarrQuality
  customFormatInfo?: {
    name?: string
    formatTag?: string
  }[]
  customFormatScore?: number
  releaseGroup?: string
  releaseTitle?: string
  size?: number
  indexer?: string
  downloadClient?: string
  downloadClientName?: string
}

export interface RadarrWebhookPayload {
  eventType: RadarrEventType
  instanceName?: string
  applicationUrl?: string
  movie: RadarrMovie
  release?: RadarrRelease
  remoteMovie?: {
    title?: string
    year?: number
  }
  downloadId?: string
  isUpgrade?: boolean
}

export function isRadarrPayload(payload: any): payload is RadarrWebhookPayload {
  return Boolean(payload && typeof payload === 'object' && payload.movie)
}
