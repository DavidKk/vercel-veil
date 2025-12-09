import type { NextRequest } from 'next/server'

import type { ParsedDMHYItem } from '@/services/dmhy/types'
import type { NewznabItem } from '@/utils/newznab'
import { NEWZNAB_MIME_TYPE } from '@/utils/newznab/constants'

import { CATEGORY_IDS, getIndexerBaseUrl, RESOLUTION_PATTERNS } from './config'

/**
 * Detect video quality from title
 * @param title Item title
 * @returns Array of category IDs (5000 for TV, 5030 for SD, 5040 for HD, 5060 for UHD, 5070 for Anime)
 */
function detectCategories(title: string): string[] {
  const lowerTitle = title.toLowerCase()
  const categories: string[] = [CATEGORY_IDS.TV] // Always include TV category (root)

  // Detect resolution and add appropriate category
  if (RESOLUTION_PATTERNS.UHD.test(lowerTitle)) {
    categories.push(CATEGORY_IDS.TV_UHD)
  } else if (RESOLUTION_PATTERNS.HD.test(lowerTitle)) {
    categories.push(CATEGORY_IDS.TV_HD)
  } else if (RESOLUTION_PATTERNS.SD.test(lowerTitle)) {
    categories.push(CATEGORY_IDS.TV_SD)
  } else {
    // Default to HD if no resolution specified (most modern content is HD)
    categories.push(CATEGORY_IDS.TV_HD)
  }

  // Include Anime category for DMHY anime content
  categories.push(CATEGORY_IDS.TV_ANIME)

  return categories
}

/**
 * Generate a mock Newznab item for testing purposes
 * @param req Next.js request object
 * @returns Mock Newznab item with proper category attributes
 */
export function generateMockNewznabItem(req: NextRequest): NewznabItem {
  const now = new Date()
  const pubDate = now.toUTCString()
  const mockTitle = '[DMHY-Test][One Piece 海賊王][1151][1080p][WEB-RIP][CHT][SRT][MKV]'
  const categories = detectCategories(mockTitle)
  const seriesName = extractSeriesName(mockTitle)

  const mockMagnetUrl = 'magnet:?xt=urn:btih:TESTMOCKDATA1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'

  const baseUrl = getIndexerBaseUrl(req)

  return {
    title: mockTitle,
    link: mockMagnetUrl,
    guid: `${baseUrl}/api/indexer/dmhy/test-mock-guid`,
    pubDate,
    enclosure: {
      url: mockMagnetUrl,
      type: NEWZNAB_MIME_TYPE,
      length: 1024000000, // 1GB
    },
    size: 1024000000,
    description: 'Mock test item for Newznab Indexer - This is a test entry to verify category configuration',
    attributes: [
      // Category attributes
      ...categories.map((cat) => ({ name: 'category', value: cat })),
      // TV-specific required attributes
      { name: 'series', value: seriesName },
      { name: 'season', value: '1' },
      { name: 'episode', value: '1151' },
      { name: 'absolute', value: '1151' },
      // Volume factors for magnet (common Torznab practice)
      { name: 'downloadvolumefactor', value: '0' },
      { name: 'uploadvolumefactor', value: '1' },
    ],
  }
}

/**
 * Extract series name from title (simplified - assumes title contains series name)
 * @param title Item title
 * @returns Series name or empty string
 */
function extractSeriesName(title: string): string {
  // Try to extract series name from common patterns
  // Pattern: [Group][Series Name][Episode][Quality]...
  const bracketMatch = title.match(/\]\[([^\]]+)\]/)
  if (bracketMatch && bracketMatch[1]) {
    // Remove episode numbers and quality indicators
    let seriesName = bracketMatch[1]
      .replace(/\[\d+\]/g, '') // Remove [1151] style episode numbers
      .replace(/第\d+[話话]/g, '') // Remove 第1151話 style
      .replace(/\d+p/i, '') // Remove 1080p, 720p, etc.
      .replace(/\[.*?\]/g, '') // Remove any remaining brackets
      .trim()

    if (seriesName) {
      return seriesName
    }
  }

  // Fallback: use first part of title before common separators
  const fallbackMatch = title.match(/^[^\[]+\[([^\]]+)\]/)
  if (fallbackMatch && fallbackMatch[1]) {
    return fallbackMatch[1].trim()
  }

  return 'Unknown Series'
}

/**
 * Convert DMHY items to Newznab items
 * @param items Array of parsed DMHY RSS items
 * @param season Season number (default: 1)
 * @param episode Episode number within season (optional, uses item.episode if not provided)
 * @param absoluteEpisode Absolute episode number (optional, uses episode if not provided)
 * @returns Array of Newznab items
 */
export function convertToNewznabItems(items: ParsedDMHYItem[], season = 1, episode?: number, absoluteEpisode?: number): NewznabItem[] {
  return items.map((item) => {
    const categories = detectCategories(item.title)
    const seriesName = extractSeriesName(item.title)
    // Use provided episode or fallback to item.episode or 1
    const episodeNum = episode ?? item.episode ?? 1
    // Use provided absolute episode or fallback to episodeNum
    const absoluteNum = absoluteEpisode ?? episodeNum
    const seasonForAnime = season >= 1 ? season : 1 // Sonarr expects season >= 1

    // Build attributes array with required fields
    const attributes: Array<{ name: string; value: string }> = [
      // Category attributes (required)
      ...categories.map((cat) => ({ name: 'category', value: cat })),
      // TV-specific required attributes (supports both season/episode and absolute numbering)
      { name: 'series', value: seriesName },
      { name: 'season', value: String(seasonForAnime) },
      { name: 'episode', value: String(episodeNum) },
      { name: 'absolute', value: String(absoluteNum) },
      // Volume factors for magnet (common Torznab practice)
      { name: 'downloadvolumefactor', value: '0' },
      { name: 'uploadvolumefactor', value: '1' },
    ]

    return {
      title: item.title,
      link: item.magnet,
      guid: item.guid,
      pubDate: item.pubDate,
      enclosure: {
        url: item.magnet,
        type: NEWZNAB_MIME_TYPE,
        length: item.size,
      },
      size: item.size,
      // Add Torznab attributes (category, season, episode, series)
      attributes,
    }
  })
}
