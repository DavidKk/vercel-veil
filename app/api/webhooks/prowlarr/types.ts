export type ProwlarrEventType = 'Test' | 'Grab' | 'IndexerStatusChange' | 'IndexerUpdate' | 'IndexerDelete' | 'IndexerAdded' | string

export interface ProwlarrIndexer {
  id?: number
  name: string
  protocol?: 'torrent' | 'usenet'
  fields?: Array<{
    name?: string
    value?: string
  }>
  enableRss?: boolean
  enableAutomaticSearch?: boolean
  enableInteractiveSearch?: boolean
  priority?: number
  downloadClientId?: number
  appProfileId?: number
}

export interface ProwlarrQuality {
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

export interface ProwlarrRelease {
  quality?: ProwlarrQuality
  releaseGroup?: string
  releaseTitle?: string
  indexer?: string
  size?: number
  downloadClient?: string
  downloadClientName?: string
}

export interface ProwlarrWebhookPayload {
  eventType: ProwlarrEventType
  instanceName?: string
  applicationUrl?: string
  indexer?: ProwlarrIndexer
  indexers?: ProwlarrIndexer[]
  release?: ProwlarrRelease
  message?: string
  previousStatus?: string
  newStatus?: string
}

export function isProwlarrPayload(payload: any): payload is ProwlarrWebhookPayload {
  return Boolean(payload && typeof payload === 'object' && (payload.indexer || payload.indexers || payload.eventType))
}
