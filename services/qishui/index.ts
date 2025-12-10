import { selectOne } from 'css-select'
import { parseDocument } from 'htmlparser2'

import { fetchWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'

import { QISHUI_HEADERS, QISHUI_PLAYLIST_SELECTOR } from './constants'
import type { Playlist, PlaylistItem } from './types'

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
 * Parse Qishui music playlist HTML
 * @param html HTML string
 * @returns Parsed playlist data
 */
export function parseQishuiPlaylist(html: string): Playlist {
  info('Parsing Qishui playlist HTML')

  try {
    // Parse HTML
    const document = parseDocument(html)

    // Use CSS selector to find target element
    // Selector: #root > div > div > div > div > div:nth-child(2)
    const targetElement = selectOne(QISHUI_PLAYLIST_SELECTOR, document)

    if (!targetElement) {
      warn('Target element not found in HTML')
      return []
    }

    // Extract text content (simulate innerText)
    const textContent = extractTextContent(targetElement)

    if (!textContent || !textContent.trim()) {
      warn('No text content found in target element')
      return []
    }

    // Process text according to user-provided logic
    // `\n${q}`.split(/\n\d+\n/).map((item) => item.split('\n').filter(Boolean)).filter((item) => item.length)
    const processedText = `\n${textContent}`
    const parts = processedText.split(/\n\d+\n/)

    // According to user logic: split each part by newline, filter empty strings, then filter empty arrays
    const items = parts.map((part) => part.split('\n').filter((line) => line.trim().length > 0)).filter((item) => item.length > 0)

    const playlist: Playlist = []

    // Convert each item to playlist item format [song title, artist/album information]
    for (const item of items) {
      if (item.length >= 2) {
        // First two lines: song title and artist/album information
        playlist.push([item[0].trim(), item[1].trim()] as PlaylistItem)
      } else if (item.length === 1) {
        // If only one line, second item is empty string
        playlist.push([item[0].trim(), ''] as PlaylistItem)
      }
    }

    info(`Parsed ${playlist.length} songs from playlist`)
    return playlist
  } catch (error) {
    fail('Error parsing Qishui playlist HTML:', error)
    return []
  }
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
