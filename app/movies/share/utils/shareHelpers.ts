import { getFavoriteMovies } from '@/services/tmdb'
import { hasTmdbAuth } from '@/services/tmdb/env'

/**
 * Get favorite IDs for share pages
 * @returns Promise that resolves to a Set of favorite movie IDs
 */
export async function getFavoriteIdsForShare(): Promise<Set<number>> {
  const favoriteAvailable = hasTmdbAuth()
  if (!favoriteAvailable) {
    return new Set<number>()
  }

  try {
    return await getFavoriteMovies()
  } catch {
    return new Set<number>()
  }
}
