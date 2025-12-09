/**
 * ACG.RIP RSS Item
 */
export interface ACGRIPRSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  guid: string
  enclosure?: {
    url: string
    length?: string
    type?: string
  }
  author?: string
  category?: string
}

/**
 * ACG.RIP RSS Channel
 */
export interface ACGRIPRSSChannel {
  title: string
  link: string
  description: string
  ttl?: string
  item: ACGRIPRSSItem[]
}

/**
 * ACG.RIP RSS DTO
 */
export interface ACGRIPRSSDTO {
  rss: {
    channel: ACGRIPRSSChannel
  }
}

/**
 * Parsed ACG.RIP item with optional episode number
 */
export interface ParsedACGRIPItem {
  title: string
  link: string
  magnet: string
  pubDate: string
  guid: string
  episode: number | null // Episode number, null if not found
  size?: number
  author?: string
  category?: string
}
