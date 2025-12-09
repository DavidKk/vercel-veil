import { XMLParser } from 'fast-xml-parser'

import { fetchWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'

import { DMHY_CACHE, DMHY_RSS_BASE_URL, EPISODE_PATTERNS, RSS_HEADERS } from './constants'
import type { DMHYCacheEntry, DMHYRSSDTO, ParsedDMHYItem } from './types'

/**
 * In-memory cache for DMHY RSS data
 */
const cache = new Map<string, DMHYCacheEntry>()

/**
 * Clear cache (for testing purposes)
 */
export function clearDMHYCache(): void {
  cache.clear()
}

/**
 * Check if today is Monday (day of week = 1)
 */
function isMonday(): boolean {
  const today = new Date()
  return today.getDay() === 1
}

/**
 * Get current day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
function getDayOfWeek(): number {
  return new Date().getDay()
}

/**
 * Check if cache needs update (Monday or cache expired)
 */
function shouldUpdateCache(cacheEntry: DMHYCacheEntry | null | undefined): boolean {
  if (!cacheEntry) {
    return true
  }

  const now = Date.now()
  const isExpired = now - cacheEntry.timestamp >= DMHY_CACHE.DURATION

  // Update on Monday or if cache expired
  const isMondayToday = isMonday()
  const wasUpdatedOnMonday = cacheEntry.lastUpdateDay === 1

  // If today is Monday and last update was not on Monday, update
  if (isMondayToday && !wasUpdatedOnMonday) {
    return true
  }

  // If cache expired, update
  if (isExpired) {
    return true
  }

  return false
}

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
 * Parse DMHY RSS item to extract episode information
 */
function parseDMHYItem(item: any): ParsedDMHYItem | null {
  // Extract text values (handles CDATA automatically)
  const title = extractTextValue(item.title) || ''
  const link = extractTextValue(item.link) || ''
  const pubDate = extractTextValue(item.pubDate) || ''
  const guid = extractTextValue(item.guid) || ''

  // Handle enclosure - attributes are prefixed with @_
  const enclosure = item.enclosure || {}
  let magnetUrl = ''

  // Try different ways to get magnet URL (attribute is @_url)
  if (enclosure['@_url']) {
    magnetUrl = enclosure['@_url']
  } else if (enclosure.url) {
    magnetUrl = enclosure.url
  }

  if (!magnetUrl) {
    warn(`No magnet URL found for item: ${title}`)
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
 * Fetch and parse DMHY RSS feed
 */
async function fetchDMHYRSS(url: string): Promise<ParsedDMHYItem[]> {
  info(`Fetching DMHY RSS from: ${url}`)

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

  const xmlDoc = parser.parse(xmlText) as DMHYRSSDTO

  if (!xmlDoc.rss?.channel?.item) {
    warn('No items found in RSS feed')
    return []
  }

  const items = Array.isArray(xmlDoc.rss.channel.item) ? xmlDoc.rss.channel.item : [xmlDoc.rss.channel.item]

  const parsedItems: ParsedDMHYItem[] = []

  for (const item of items) {
    try {
      const parsed = parseDMHYItem(item)
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
 * Build DMHY RSS URL with optional keyword parameter
 * @param keyword Optional search keyword
 * @returns Complete RSS URL
 */
function buildDMHYRSSUrl(keyword?: string): string {
  if (!keyword) {
    return DMHY_RSS_BASE_URL
  }
  // Encode keyword for URL (spaces become +)
  const encodedKeyword = encodeURIComponent(keyword).replace(/%20/g, '+')
  return `${DMHY_RSS_BASE_URL}?keyword=${encodedKeyword}`
}

/**
 * Get DMHY RSS data with caching
 * @param keyword Optional search keyword
 * @returns Parsed DMHY items
 */
export async function getDMHYRSSData(keyword?: string): Promise<ParsedDMHYItem[]> {
  const url = buildDMHYRSSUrl(keyword)
  const cacheKey = keyword || 'all'

  const cacheEntry = cache.get(cacheKey)
  const needsUpdate = shouldUpdateCache(cacheEntry)

  if (cacheEntry && !needsUpdate) {
    info(`DMHY cache hit for keyword "${cacheKey}": ${cacheEntry.items.length} items`)
    return cacheEntry.items
  }

  info(`DMHY cache miss or expired for keyword "${cacheKey}", fetching RSS from: ${url}`)

  try {
    const items = await fetchDMHYRSS(url)

    // Update cache
    const newCacheEntry: DMHYCacheEntry = {
      items,
      timestamp: Date.now(),
      lastUpdateDay: getDayOfWeek(),
    }

    cache.set(cacheKey, newCacheEntry)
    info(`DMHY cache updated for keyword "${cacheKey}": ${items.length} items`)

    return items
  } catch (error) {
    fail(`Failed to fetch DMHY RSS:`, error)

    // Return cached data if available, even if expired
    if (cacheEntry) {
      warn('Using expired cache due to fetch error')
      return cacheEntry.items
    }

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
 * Search DMHY items by keyword (fetches from DMHY RSS with keyword parameter)
 * @param keyword Search keyword (e.g., anime name, anime name + season)
 * @returns All matching items from DMHY RSS
 */
export async function searchByKeyword(keyword: string): Promise<ParsedDMHYItem[]> {
  // Fetch all items matching the keyword from DMHY RSS
  // This will cache the results to avoid repeated requests
  return await getDMHYRSSData(keyword)
}

/**
 * Search DMHY items by episode number from cached results
 * @param keyword Search keyword (e.g., anime name, anime name + season)
 * @param episode Episode number to filter
 * @returns Matching items with the specified episode number
 */
export async function searchByEpisode(keyword: string, episode: number): Promise<ParsedDMHYItem[]> {
  // First get all items for the keyword (from cache if available)
  const items = await getDMHYRSSData(keyword)
  // Then filter by episode number (only items with matching episode number)
  return items.filter((item) => item.episode !== null && item.episode === episode)
}

/**
 * Search DMHY items by query string (for backward compatibility)
 * This now uses keyword-based search
 * @param keyword Search keyword
 * @returns All matching items
 */
export async function searchByQuery(keyword: string): Promise<ParsedDMHYItem[]> {
  return await searchByKeyword(keyword)
}
