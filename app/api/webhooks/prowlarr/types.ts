export type ProwlarrEventType = 'Test' | 'IndexerStatusChange' | 'IndexerUpdate' | 'IndexerDelete' | 'IndexerAdded' | string

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

export interface ProwlarrWebhookPayload {
  eventType: ProwlarrEventType
  instanceName?: string
  applicationUrl?: string
  indexer?: ProwlarrIndexer
  indexers?: ProwlarrIndexer[]
  message?: string
  previousStatus?: string
  newStatus?: string
}

export function isProwlarrPayload(payload: any): payload is ProwlarrWebhookPayload {
  return Boolean(payload && typeof payload === 'object' && (payload.indexer || payload.indexers || payload.eventType))
}
