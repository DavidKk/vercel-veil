import type { Anime } from '@/services/anilist/types'

/**
 * Anime cache data structure
 */
export interface AnimeCacheData {
  current: {
    date: string // UTC date, e.g., "2024-01-15"
    timestamp: number // UTC timestamp (data update time)
    anime: Anime[]
    metadata: {
      totalCount: number
      description: string
    }
  }
  previous: {
    date: string // UTC date
    timestamp: number // UTC timestamp
    anime: Anime[]
    metadata: {
      totalCount: number
      description: string
    }
  }
}
