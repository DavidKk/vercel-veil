import type { MergedMovie } from '@/services/maoyan/types'

/**
 * Movies cache data structure
 */
export interface MoviesCacheData {
  current: {
    date: string // UTC date, e.g., "2024-01-15"
    timestamp: number // UTC timestamp (data update time)
    movies: MergedMovie[]
    metadata: {
      totalCount: number
      description: string
    }
  }
  previous: {
    date: string // UTC date
    timestamp: number // UTC timestamp
    movies: MergedMovie[]
    metadata: {
      totalCount: number
      description: string
    }
  }
}
