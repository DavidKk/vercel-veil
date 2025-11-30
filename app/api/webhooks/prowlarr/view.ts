import { escapeHtml, formatFileSize } from '@/utils/webhooks/format'

import type { ProwlarrIndexer, ProwlarrRelease, ProwlarrWebhookPayload } from './types'

/**
 * Template variables for Prowlarr email notifications
 */
export interface ProwlarrTemplateVariables {
  /** Indexer name */
  indexerName: string
  /** Event type (e.g., IndexerStatusChange, IndexerUpdate, Grab) */
  eventType: string
  /** Localized action label */
  actionLabel: string
  /** Prowlarr instance name */
  instanceName: string
  /** Indexer protocol (torrent/usenet) */
  protocol: string
  /** Status change information */
  statusChange: string
  /** Additional message */
  message: string
  /** Indexer details HTML */
  indexerDetails: string
  /** Release details HTML (for Grab events) */
  releaseDetails: string
  /** Application URL (from webhook payload, not displayed in template) */
  applicationUrl: string
}

/**
 * Prepare template variables from Prowlarr webhook payload
 * @param payload Prowlarr webhook payload
 * @returns Template variables ready for email rendering
 */
export async function prepareProwlarrTemplateVariables(payload: ProwlarrWebhookPayload): Promise<ProwlarrTemplateVariables> {
  // For Grab events, get indexer name from release.indexer first, then fallback to indexer.name
  const indexer = payload.indexer ?? payload.indexers?.[0]
  const indexerName = payload.release?.indexer ?? indexer?.name ?? 'Unknown Indexer'
  const eventType = payload.eventType ?? 'Unknown Event'
  const instanceName = payload.instanceName ?? ''

  // For Grab events, try to infer protocol from release title or use indexer protocol
  let protocol = 'Unknown'
  if (payload.release?.indexer && indexer?.protocol) {
    protocol = indexer.protocol.charAt(0).toUpperCase() + indexer.protocol.slice(1)
  } else if (indexer?.protocol) {
    protocol = indexer.protocol.charAt(0).toUpperCase() + indexer.protocol.slice(1)
  }

  const message = payload.message ?? ''
  const applicationUrl = payload.applicationUrl ?? ''

  const actionLabel = getActionLabel(eventType)
  const statusChange = formatStatusChange(payload)
  const indexerDetails = formatIndexerDetails(indexer)
  const releaseDetails = formatReleaseDetails(payload.release)

  return {
    indexerName,
    eventType,
    actionLabel,
    instanceName,
    protocol,
    statusChange,
    message,
    indexerDetails,
    releaseDetails,
    applicationUrl,
  }
}

/**
 * Convert event type to localized label
 * @param eventType Event type string
 * @returns Localized label
 */
function getActionLabel(eventType: string): string {
  const labels: Record<string, string> = {
    Test: 'Test',
    Grab: 'Grab',
    IndexerStatusChange: 'Indexer Status Change',
    IndexerUpdate: 'Indexer Update',
    IndexerDelete: 'Indexer Delete',
    IndexerAdded: 'Indexer Added',
  }
  return labels[eventType] ?? eventType
}

/**
 * Format status change information
 * @param payload Prowlarr webhook payload
 * @returns Formatted status change string, returns 'N/A' if no status information available
 */
function formatStatusChange(payload: ProwlarrWebhookPayload): string {
  if (payload.previousStatus && payload.newStatus) {
    return `${escapeHtml(payload.previousStatus)} → ${escapeHtml(payload.newStatus)}`
  }
  if (payload.newStatus) {
    return escapeHtml(payload.newStatus)
  }
  if (payload.previousStatus) {
    return escapeHtml(payload.previousStatus)
  }
  // Return 'N/A' for events that don't have status information (e.g., Grab, IndexerUpdate, etc.)
  return 'N/A'
}

/**
 * Format release details as HTML for template
 * @param release Release information from Prowlarr
 * @returns HTML string with release details
 */
function formatReleaseDetails(release?: ProwlarrRelease): string {
  if (!release) {
    return ''
  }

  const items: string[] = []

  const qualityName = release.quality?.quality?.name
  const qualitySource = release.quality?.quality?.source
  const resolution = release.quality?.quality?.resolution
  if (qualityName || qualitySource || resolution) {
    const qualityText = [qualityName, qualitySource, resolution && `${resolution}p`].filter(Boolean).join(' / ')
    items.push(`<div class="stack-item">Quality: ${escapeHtml(qualityText)}</div>`)
  }

  if (release.releaseTitle) {
    items.push(`<div class="stack-item">Title: ${escapeHtml(release.releaseTitle)}</div>`)
  }

  if (release.releaseGroup) {
    items.push(`<div class="stack-item">Release Group: ${escapeHtml(release.releaseGroup)}</div>`)
  }

  const size = formatFileSize(release.size)
  if (size) {
    items.push(`<div class="stack-item">Size: ${escapeHtml(size)}</div>`)
  }

  if (release.indexer) {
    items.push(`<div class="stack-item">Indexer: ${escapeHtml(release.indexer)}</div>`)
  }

  if (release.downloadClient || release.downloadClientName) {
    items.push(`<div class="stack-item">Download Client: ${escapeHtml(release.downloadClientName ?? release.downloadClient ?? '')}</div>`)
  }

  return items.join('')
}

/**
 * Format indexer details as HTML for template
 * @param indexer Indexer information from Prowlarr
 * @returns HTML string with indexer details
 */
function formatIndexerDetails(indexer?: ProwlarrIndexer): string {
  if (!indexer) {
    return ''
  }

  const items: string[] = []

  if (indexer.protocol) {
    items.push(`<div class="stack-item">Protocol: ${escapeHtml(indexer.protocol)}</div>`)
  }

  if (typeof indexer.priority === 'number') {
    items.push(`<div class="stack-item">Priority: ${escapeHtml(String(indexer.priority))}</div>`)
  }

  if (typeof indexer.enableRss === 'boolean') {
    items.push(`<div class="stack-item">RSS: ${indexer.enableRss ? 'Enabled' : 'Disabled'}</div>`)
  }

  if (typeof indexer.enableAutomaticSearch === 'boolean') {
    items.push(`<div class="stack-item">Automatic Search: ${indexer.enableAutomaticSearch ? 'Enabled' : 'Disabled'}</div>`)
  }

  if (typeof indexer.enableInteractiveSearch === 'boolean') {
    items.push(`<div class="stack-item">Interactive Search: ${indexer.enableInteractiveSearch ? 'Enabled' : 'Disabled'}</div>`)
  }

  if (indexer.fields && indexer.fields.length > 0) {
    const fieldItems = indexer.fields
      .filter((field) => field.name && field.value)
      .map((field) => `${escapeHtml(field.name!)}: ${escapeHtml(field.value!)}`)
      .join(', ')
    if (fieldItems) {
      items.push(`<div class="stack-item">Fields: ${fieldItems}</div>`)
    }
  }

  return items.join('')
}
