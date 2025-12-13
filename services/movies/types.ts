import type { MergedMovie } from '@/services/maoyan/types'

/**
 * Movies cache data structure
 */
export interface MoviesCacheData {
  data: {
    date: string // UTC date, e.g., "2024-01-15"
    timestamp: number // UTC timestamp (data update time)
    movies: MergedMovie[]
    metadata: {
      totalCount: number
      description: string
    }
  }
  // List of movie IDs that have been notified
  // Movie ID format: maoyanId (if exists) > tmdbId (if exists) > name (fallback)
  notifiedMovieIds: string[]
}
