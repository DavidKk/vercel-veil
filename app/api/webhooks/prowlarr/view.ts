import { escapeHtml } from '@/utils/webhooks/format'

import type { ProwlarrIndexer, ProwlarrWebhookPayload } from './types'

/**
 * Template variables for Prowlarr email notifications
 */
export interface ProwlarrTemplateVariables {
  /** Indexer name */
  indexerName: string
  /** Event type (e.g., IndexerStatusChange, IndexerUpdate) */
  eventType: string
  /** Localized action label in Chinese */
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
  /** Application URL */
  applicationUrl: string
}

/**
 * Prepare template variables from Prowlarr webhook payload
 * @param payload Prowlarr webhook payload
 * @returns Template variables ready for email rendering
 */
export async function prepareProwlarrTemplateVariables(payload: ProwlarrWebhookPayload): Promise<ProwlarrTemplateVariables> {
  const indexer = payload.indexer ?? payload.indexers?.[0]
  const indexerName = indexer?.name ?? 'Unknown Indexer'
  const eventType = payload.eventType ?? 'Unknown Event'
  const instanceName = payload.instanceName ?? ''
  const protocol = indexer?.protocol ? indexer.protocol.charAt(0).toUpperCase() + indexer.protocol.slice(1) : 'Unknown'
  const message = payload.message ?? ''
  const applicationUrl = payload.applicationUrl ?? ''

  const actionLabel = getActionLabel(eventType)
  const statusChange = formatStatusChange(payload)
  const indexerDetails = formatIndexerDetails(indexer)

  return {
    indexerName,
    eventType,
    actionLabel,
    instanceName,
    protocol,
    statusChange,
    message,
    indexerDetails,
    applicationUrl,
  }
}

/**
 * Convert event type to localized Chinese label
 * @param eventType Event type string
 * @returns Localized label in Chinese
 */
function getActionLabel(eventType: string): string {
  const labels: Record<string, string> = {
    Test: '测试',
    IndexerStatusChange: '索引器状态变更',
    IndexerUpdate: '索引器更新',
    IndexerDelete: '索引器删除',
    IndexerAdded: '索引器添加',
  }
  return labels[eventType] ?? eventType
}

/**
 * Format status change information
 * @param payload Prowlarr webhook payload
 * @returns Formatted status change string
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
  return ''
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
