export type SonarrEventType = 'Test' | 'Grab' | 'Download' | 'Upgrade' | 'Rename' | 'EpisodeFileDelete' | 'SeriesDelete' | string

export interface SonarrSeries {
  id?: number
  title: string
  titleSlug?: string
  path?: string
  tvdbId?: number
  imdbId?: string
  // Optional image fields that may be included in webhook payload
  // Sonarr webhook images: coverType (poster/fanart/banner), url (local path), remoteUrl (full URL)
  images?: Array<{
    coverType?: string
    url?: string
    remoteUrl?: string
  }>
  poster?: string
  fanart?: string
}

export interface SonarrEpisode {
  id?: number
  title: string
  seasonNumber: number
  episodeNumber: number
  absoluteEpisodeNumber?: number
  airDate?: string
  airDateUtc?: string
}

export interface SonarrQuality {
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

export interface SonarrRelease {
  quality?: SonarrQuality
  releaseGroup?: string
  releaseTitle?: string
  indexer?: string
  size?: number
  downloadClient?: string
  downloadClientName?: string
}

export interface SonarrWebhookPayload {
  eventType: SonarrEventType
  instanceName?: string
  applicationUrl?: string
  series: SonarrSeries
  episodes: SonarrEpisode[]
  release?: SonarrRelease
  downloadClient?: string
  downloadClientName?: string
  downloadId?: string
  isUpgrade?: boolean
}

export function isSonarrPayload(payload: any): payload is SonarrWebhookPayload {
  return Boolean(payload && typeof payload === 'object' && payload.series && Array.isArray(payload.episodes))
}
