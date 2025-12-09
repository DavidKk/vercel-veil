import { XMLParser } from 'fast-xml-parser'

import { fetchWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'

import { ACGRIP_RSS_BASE_URL, EPISODE_PATTERNS, RSS_HEADERS } from './constants'
import type { ACGRIPRSSDTO, ParsedACGRIPItem } from './types'

/**
 * Extract episode number from title
 * @param title RSS item title
 * @returns Episode number or null if not found
 */
function extractEpisodeNumber(title: string): number | null {
  // Try each pattern (except the last fallback pattern)
  for (let i = 0; i < EPISODE_PATTERNS.length - 1; i++) {
    const pattern = EPISODE_PATTERNS[i]
    const matches = Array.from(title.matchAll(pattern))
    if (matches.length > 0) {
      const match = matches[0]
      const episode = parseInt(match[1], 10)
      if (!isNaN(episode) && episode > 0) {
        return episode
      }
    }
  }

  // For the last pattern (simple number fallback), be more careful
  // Only use it if the number is likely an episode (not resolution, year, etc.)
  const fallbackPattern = EPISODE_PATTERNS[EPISODE_PATTERNS.length - 1]
  const matches = Array.from(title.matchAll(fallbackPattern))
  if (matches.length > 0) {
    // Use the last match (likely episode number)
    const match = matches[matches.length - 1]
    const episode = parseInt(match[1], 10)

    // Filter out common non-episode numbers:
    // - Numbers followed by 'p' (resolution like 1080p, 720p)
    // - Numbers that are too large (likely not episode numbers, e.g., years)
    const matchIndex = match.index ?? 0
    const afterMatch = title.substring(matchIndex + match[0].length)

    // Skip if followed by 'p' (resolution indicator)
    if (afterMatch.trim().startsWith('p') || afterMatch.trim().startsWith('P')) {
      return null
    }

    // Skip if too large (likely year or other identifier)
    if (episode > 10000) {
      return null
    }

    if (!isNaN(episode) && episode > 0) {
      return episode
    }
  }

  return null
}

/**
 * Extract text value from XML node (handles CDATA and plain text)
 */
function extractTextValue(node: any): string {
  if (typeof node === 'string') {
    return node
  }
  if (node?.['#text']) {
    return node['#text']
  }
  if (node?._text) {
    return node._text
  }
  return ''
}

/**
 * Parse ACG.RIP RSS item to extract episode information
 */
function parseACGRIPItem(item: any): ParsedACGRIPItem | null {
  // Extract text values (handles CDATA automatically)
  const title = extractTextValue(item.title) || ''
  const link = extractTextValue(item.link) || ''
  const pubDate = extractTextValue(item.pubDate) || ''
  const guid = extractTextValue(item.guid) || ''

  // Handle enclosure - attributes are prefixed with @_
  const enclosure = item.enclosure || {}
  let magnetUrl = ''

  // Try different ways to get magnet/torrent URL (attribute is @_url)
  if (enclosure['@_url']) {
    magnetUrl = enclosure['@_url']
  } else if (enclosure.url) {
    magnetUrl = enclosure.url
  }

  if (!magnetUrl) {
    warn(`No magnet/torrent URL found for item: ${title}`)
    return null
  }

  // Extract episode number (optional - some items may not have episode numbers)
  const episode = extractEpisodeNumber(title)

  // Parse size if available (attribute is @_length)
  let size: number | undefined
  const sizeStr = enclosure['@_length'] || enclosure.length
  if (sizeStr) {
    const parsedSize = parseInt(String(sizeStr), 10)
    if (!isNaN(parsedSize) && parsedSize > 0) {
      size = parsedSize
    }
  }

  return {
    title,
    link,
    magnet: magnetUrl,
    pubDate,
    guid,
    episode: episode ?? null,
    size,
    author: extractTextValue(item.author),
    category: extractTextValue(item.category),
  }
}

/**
 * Fetch and parse ACG.RIP RSS feed
 */
async function fetchACGRIPRSS(url: string): Promise<ParsedACGRIPItem[]> {
  info(`Fetching ACG.RIP RSS from: ${url}`)

  const buffer = await fetchWithCache(url, {
    method: 'GET',
    headers: RSS_HEADERS,
    cacheDuration: 60 * 1000, // 1 minute
  })

  // Convert ArrayBuffer to text
  const decoder = new TextDecoder('utf-8')
  const xmlText = decoder.decode(buffer)
  // Use same parser options as douban service for consistency
  // But also handle attributes for enclosure
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: false,
    trimValues: true,
  })

  const xmlDoc = parser.parse(xmlText) as ACGRIPRSSDTO

  if (!xmlDoc.rss?.channel?.item) {
    warn('No items found in RSS feed')
    return []
  }

  const items = Array.isArray(xmlDoc.rss.channel.item) ? xmlDoc.rss.channel.item : [xmlDoc.rss.channel.item]

  const parsedItems: ParsedACGRIPItem[] = []

  for (const item of items) {
    try {
      const parsed = parseACGRIPItem(item)
      if (parsed) {
        parsedItems.push(parsed)
      }
    } catch (error) {
      fail(`Error parsing RSS item:`, error)
    }
  }

  info(`Parsed ${parsedItems.length} items from RSS feed`)
  return parsedItems
}

/**
 * Build ACG.RIP RSS URL with optional term parameter
 * @param term Optional search term
 * @returns Complete RSS URL
 */
function buildACGRIPRSSUrl(term?: string): string {
  if (!term) {
    return ACGRIP_RSS_BASE_URL
  }
  // Encode term for URL (spaces become %20, then we can keep them as %20 or convert to +)
  const encodedTerm = encodeURIComponent(term)
  return `${ACGRIP_RSS_BASE_URL}?term=${encodedTerm}`
}

/**
 * Get ACG.RIP RSS data
 * @param term Optional search term
 * @returns Parsed ACG.RIP items
 */
export async function getACGRIPRSSData(term?: string): Promise<ParsedACGRIPItem[]> {
  const url = buildACGRIPRSSUrl(term)
  info(`Fetching ACG.RIP RSS (no local cache) for term "${term ?? 'all'}": ${url}`)

  try {
    return await fetchACGRIPRSS(url)
  } catch (error) {
    fail(`Failed to fetch ACG.RIP RSS:`, error)

    // Distinguish between network errors and HTTP errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('HTTP error! Status:')) {
      // HTTP error (4xx, 5xx) from fetchWithCache - rethrow
      throw error
    }

    // Network error (fetch rejection, e.g., network timeout, DNS failure) - return empty array gracefully
    return []
  }
}

/**
 * Search ACG.RIP items by term (fetches from ACG.RIP RSS with term parameter)
 * @param term Search term (e.g., anime name)
 * @returns All matching items from ACG.RIP RSS
 */
export async function searchByTerm(term: string): Promise<ParsedACGRIPItem[]> {
  // Fetch all items matching the term from ACG.RIP RSS
  // This will cache the results to avoid repeated requests
  return await getACGRIPRSSData(term)
}

/**
 * Search ACG.RIP items by episode number from cached results
 * @param term Search term (e.g., anime name)
 * @param episode Episode number to filter
 * @returns Matching items with the specified episode number
 */
export async function searchByEpisode(term: string, episode: number): Promise<ParsedACGRIPItem[]> {
  // First get all items for the term (from cache if available)
  const items = await getACGRIPRSSData(term)
  // Then filter by episode number (only items with matching episode number)
  return items.filter((item) => item.episode !== null && item.episode === episode)
}

/**
 * Search ACG.RIP items by query string (for backward compatibility)
 * This now uses term-based search
 * @param term Search term
 * @returns All matching items
 */
export async function searchByQuery(term: string): Promise<ParsedACGRIPItem[]> {
  return await searchByTerm(term)
}
