/**
 * DMHY RSS Item
 */
export interface DMHYRSSItem {
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
 * DMHY RSS Channel
 */
export interface DMHYRSSChannel {
  title: string
  link: string
  description: string
  language: string
  pubDate: string
  item: DMHYRSSItem[]
}

/**
 * DMHY RSS DTO
 */
export interface DMHYRSSDTO {
  rss: {
    channel: DMHYRSSChannel
  }
}

/**
 * Parsed DMHY item with optional episode number
 */
export interface ParsedDMHYItem {
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
