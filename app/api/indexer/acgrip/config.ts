import type { NextRequest } from 'next/server'

import type { NewznabCapabilities, NewznabChannelMetadata } from '@/utils/newznab'
import { getBaseUrl } from '@/utils/url'

/**
 * Category IDs for Newznab/Torznab
 */
export const CATEGORY_IDS = {
  TV: '5000',
  TV_SD: '5030',
  TV_HD: '5040',
  TV_UHD: '5060',
  TV_ANIME: '5070',
} as const

/**
 * Resolution detection patterns for category classification
 */
export const RESOLUTION_PATTERNS = {
  UHD: /\b(2160p|4k|uhd)\b/i,
  HD: /\b(1080p|720p|web-dl|hdtv)\b/i,
  SD: /\b(480p|360p|240p|sdtv)\b/i,
} as const

/**
 * Get base URL for the indexer
 * @param req Next.js request object
 * @returns Base URL for the indexer
 */
export function getIndexerBaseUrl(req: NextRequest): string {
  return getBaseUrl(req)
}

/**
 * Get Newznab Indexer channel metadata
 * @param req Next.js request object
 * @returns Channel metadata with dynamic base URL
 */
export function getACGRIPChannelMetadata(req: NextRequest): NewznabChannelMetadata {
  const baseUrl = getIndexerBaseUrl(req)

  return {
    title: 'Vercel Veil Indexer',
    description: 'Newznab API Indexer',
    link: baseUrl,
    language: 'zh-cn',
    webMaster: 'admin@vercel-veil.app',
    category: 'TV',
    image: {
      url: `${baseUrl}/favicon.ico`,
      title: 'Vercel Veil',
      link: baseUrl,
      description: 'Vercel Veil Indexer',
    },
    atomLink: {
      href: `${baseUrl}/api/indexer/acgrip`,
      rel: 'self',
      type: 'application/rss+xml',
    },
  }
}

/**
 * Newznab Indexer capabilities
 */
export const ACGRIP_CAPABILITIES: NewznabCapabilities = {
  server: {
    version: '1.0',
    title: 'Vercel Veil Indexer',
  },
  limits: {
    max: 100,
    default: 50,
  },
  retention: {
    days: 365,
  },
  registration: {
    available: 'no',
    open: 'no',
  },
  searching: {
    search: {
      available: 'yes',
      supportedParams: 'q',
    },
    tvSearch: {
      available: 'yes',
      supportedParams: 'q,tvdbid,season,ep',
    },
    movieSearch: {
      available: 'no',
    },
    audioSearch: {
      available: 'no',
    },
  },
  categories: [
    {
      id: '5000',
      name: 'TV',
      subcats: [
        {
          id: '5030',
          name: 'TV/SD',
        },
        {
          id: '5040',
          name: 'TV/HD',
        },
        {
          id: '5060',
          name: 'TV/UHD',
        },
        {
          id: '5070',
          name: 'TV/Anime',
        },
      ],
    },
  ],
}
