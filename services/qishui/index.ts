import { selectOne } from 'css-select'
import { parseDocument } from 'htmlparser2'

import { fetchWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'

import { QISHUI_HEADERS, QISHUI_PLAYLIST_SELECTOR, QISHUI_ROUTER_DATA_MARKER } from './constants'
import type { Playlist, PlaylistItem, QishuiMedia, QishuiRouterData } from './types'

export * from './types'

/**
 * Extract text content from HTML element
 * Simulates browser innerText behavior
 * @param element HTML element node
 * @returns Extracted text content
 */
function extractTextContent(element: any): string {
  if (!element) {
    return ''
  }

  // Text node
  if (element.type === 'text') {
    return element.data || ''
  }

  // Element node
  if (element.type === 'tag') {
    const tagName = element.name?.toLowerCase()

    // Handle line break tags
    if (tagName === 'br') {
      return '\n'
    }

    // Block elements should have line breaks between them
    const blockElements = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol']
    const isBlockElement = blockElements.includes(tagName)

    // Recursively get text from all child nodes
    if (element.children && Array.isArray(element.children)) {
      const childrenText = element.children
        .map((child: any, index: number) => {
          const childText = extractTextContent(child)
          // Add line break between block elements
          if (isBlockElement && index > 0 && child.type === 'tag') {
            const childTagName = child.name?.toLowerCase()
            if (blockElements.includes(childTagName)) {
              return '\n' + childText
            }
          }
          return childText
        })
        .join('')

      return childrenText
    }
  }

  // Other node types, try to get child nodes
  if (element.children && Array.isArray(element.children)) {
    return element.children.map((child: any) => extractTextContent(child)).join('')
  }

  return ''
}

/**
 * Extract artist display names from Qishui artist objects
 * @param artists Artist list from track or video entity
 * @returns Comma-separated artist names
 */
function formatArtistNames(artists: Array<{ name?: string | null; simple_display_name?: string | null; user_info?: { nickname?: string | null } }> | undefined): string {
  if (!Array.isArray(artists) || artists.length === 0) {
    return ''
  }

  return artists
    .map((artist) => artist.name?.trim() || artist.simple_display_name?.trim() || artist.user_info?.nickname?.trim() || '')
    .filter(Boolean)
    .join(', ')
}

/**
 * Convert a Qishui media item into playlist item format
 * @param media Media item from _ROUTER_DATA
 * @returns Playlist item or null when title is missing
 */
function mediaToPlaylistItem(media: QishuiMedia): PlaylistItem | null {
  if (media.type === 'track') {
    const track = media.entity?.track
    const title = track?.name?.trim()
    if (!track || !title) {
      return null
    }

    const artists = formatArtistNames(track.artists)
    const album = track.album?.name?.trim() || ''
    const artistInfo = [artists, album].filter(Boolean).join(' • ')
    return [title, artistInfo]
  }

  if (media.type === 'video') {
    const video = media.entity?.video
    const title = video?.title?.trim()
    if (!video || !title) {
      return null
    }

    const artists = formatArtistNames(video.artists)
    return [title, artists]
  }

  return null
}

/**
 * Parse playlist from Modern.js _ROUTER_DATA embedded in the share page
 * @param html HTML string
 * @returns Parsed playlist data, or null when router data is unavailable
 */
export function parseQishuiPlaylistFromRouterData(html: string): Playlist | null {
  const markerIndex = html.indexOf(QISHUI_ROUTER_DATA_MARKER)
  if (markerIndex < 0) {
    return null
  }

  const jsonStart = html.indexOf('{', markerIndex)
  if (jsonStart < 0) {
    return null
  }

  try {
    const parsed = JSON.parse(extractJsonObject(html, jsonStart)) as QishuiRouterData
    const medias = parsed.loaderData?.playlist_page?.medias
    if (!Array.isArray(medias) || medias.length === 0) {
      warn('No medias found in Qishui _ROUTER_DATA')
      return []
    }

    const playlist: Playlist = []
    for (const media of medias) {
      const item = mediaToPlaylistItem(media)
      if (item) {
        playlist.push(item)
      }
    }

    info(`Parsed ${playlist.length} songs from Qishui _ROUTER_DATA`)
    return playlist
  } catch (error) {
    warn('Failed to parse Qishui _ROUTER_DATA:', error)
    return null
  }
}

/**
 * Extract a balanced JSON object starting at the given index
 * @param source Source string containing JSON
 * @param startIndex Index of the opening brace
 * @returns JSON object substring
 */
function extractJsonObject(source: string, startIndex: number): string {
  let depth = 0
  let inString = false
  let escaped = false

  for (let i = startIndex; i < source.length; i++) {
    const char = source[i]

    if (inString) {
      if (escaped) {
        escaped = false
        continue
      }
      if (char === '\\') {
        escaped = true
        continue
      }
      if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(startIndex, i + 1)
      }
    }
  }

  throw new Error('Unterminated JSON object in Qishui HTML')
}

/**
 * Parse Qishui music playlist from rendered DOM text (legacy fallback)
 * @param html HTML string
 * @returns Parsed playlist data
 */
export function parseQishuiPlaylistFromDom(html: string): Playlist {
  info('Parsing Qishui playlist HTML via DOM fallback')

  try {
    const document = parseDocument(html)
    const targetElement = selectOne(QISHUI_PLAYLIST_SELECTOR, document)

    if (!targetElement) {
      warn('Target element not found in HTML')
      return []
    }

    const textContent = extractTextContent(targetElement)

    if (!textContent || !textContent.trim()) {
      warn('No text content found in target element')
      return []
    }

    // Process text according to numbered list layout:
    // `\n${q}`.split(/\n\d+\n/).map((item) => item.split('\n').filter(Boolean)).filter((item) => item.length)
    const processedText = `\n${textContent}`
    const parts = processedText.split(/\n\d+\n/)
    const items = parts.map((part) => part.split('\n').filter((line) => line.trim().length > 0)).filter((item) => item.length > 0)

    const playlist: Playlist = []

    for (const item of items) {
      if (item.length >= 2) {
        playlist.push([item[0].trim(), item[1].trim()] as PlaylistItem)
      } else if (item.length === 1) {
        playlist.push([item[0].trim(), ''] as PlaylistItem)
      }
    }

    info(`Parsed ${playlist.length} songs from playlist DOM`)
    return playlist
  } catch (error) {
    fail('Error parsing Qishui playlist HTML:', error)
    return []
  }
}

/**
 * Parse Qishui music playlist HTML
 * Prefers embedded _ROUTER_DATA, then falls back to DOM text scraping
 * @param html HTML string
 * @returns Parsed playlist data
 */
export function parseQishuiPlaylist(html: string): Playlist {
  info('Parsing Qishui playlist HTML')

  const fromRouterData = parseQishuiPlaylistFromRouterData(html)
  if (fromRouterData !== null) {
    return fromRouterData
  }

  warn('Qishui _ROUTER_DATA unavailable, falling back to DOM parsing')
  return parseQishuiPlaylistFromDom(html)
}

/**
 * Fetch Qishui music playlist from URL
 * @param url Qishui music share URL
 * @returns Parsed playlist data
 */
export async function fetchQishuiPlaylist(url: string): Promise<Playlist> {
  info(`Fetching Qishui playlist from: ${url}`)

  try {
    // Validate URL
    if (!url || !url.includes('music.douyin.com/qishui')) {
      throw new Error('Invalid Qishui playlist URL')
    }

    // Fetch HTML
    const buffer = await fetchWithCache(url, {
      method: 'GET',
      headers: QISHUI_HEADERS,
      cacheDuration: 5 * 60 * 1000, // 5 minutes
    })

    // Convert to text
    const decoder = new TextDecoder('utf-8')
    const html = decoder.decode(buffer)

    // Parse playlist
    return parseQishuiPlaylist(html)
  } catch (error) {
    fail('Error fetching Qishui playlist:', error)
    throw error
  }
}
