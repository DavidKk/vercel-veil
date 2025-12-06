'use server'

import type { GetMergedAnimeListOptions } from '@/services/anilist'
import type { Anime } from '@/services/anilist/types'
import { getAnimeListFromCache, getAnimeListWithAutoUpdate } from '@/services/anime'
import { validateCookie } from '@/services/auth/access'
import { fail } from '@/services/logger'
import { addTVToFavorites, getFavoriteTVs } from '@/services/tmdb'
import { hasTmdbAuth } from '@/services/tmdb/env'

/**
 * Get anime list with GIST cache (Server Action)
 * Internal use only, requires authentication
 * Uses GIST for persistent storage and result cache for in-memory caching
 * Automatically updates GIST if cache is stale or missing
 * @param options Options for fetching anime
 *   - includeTrending: Include trending anime (default: true)
 *   - includeUpcoming: Include upcoming anime (default: true)
 */
export async function getAnimeListWithGistCache(options: GetMergedAnimeListOptions = {}): Promise<Anime[]> {
  // Authentication errors should be thrown immediately
  if (!(await validateCookie())) {
    fail('Unauthorized access to anime list')
    throw new Error('Unauthorized')
  }

  // Use unified function that handles both reading and writing to GIST
  return await getAnimeListWithAutoUpdate(options)
}

/**
 * Get user's favorite anime IDs from TMDB (Server Action)
 * Internal use only, requires authentication
 */
export async function getFavoriteAnimeIds(): Promise<number[]> {
  if (!(await validateCookie())) {
    fail('Unauthorized access to favorite anime IDs')
    return []
  }

  if (!hasTmdbAuth()) {
    return []
  }

  try {
    const favoriteIds = await getFavoriteTVs()
    return Array.from(favoriteIds)
  } catch (error) {
    fail('getFavoriteAnimeIds - Error:', error)
    return []
  }
}

/**
 * Add anime to TMDB favorites list (Server Action)
 * Internal use only, requires authentication
 */
export async function favoriteAnime(tmdbId: number, favorite = true): Promise<{ success: boolean; message: string }> {
  try {
    if (!(await validateCookie())) {
      fail('Unauthorized access to favorite anime')
      return {
        success: false,
        message: 'Unauthorized',
      }
    }
  } catch (error) {
    fail('favoriteAnime - Auth check error:', error)
    return {
      success: false,
      message: 'Unauthorized',
    }
  }

  try {
    await addTVToFavorites(tmdbId, favorite)

    return {
      success: true,
      message: favorite ? 'Added to favorites' : 'Removed from favorites',
    }
  } catch (error) {
    fail('favoriteAnime - Error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Operation failed'
    return {
      success: false,
      message: errorMessage,
    }
  }
}

/**
 * Check if favorite feature is available (Server Action)
 * Internal use only, requires authentication
 */
export async function isFavoriteFeatureAvailable(): Promise<boolean> {
  try {
    if (!(await validateCookie())) {
      return false
    }
    return hasTmdbAuth()
  } catch (error) {
    fail('isFavoriteFeatureAvailable - Error:', error)
    return false
  }
}

/**
 * Get a single anime by ID from cache only (Server Action)
 * Internal use only, requires authentication
 * This function only reads from cache, never triggers updates or external API calls
 * @param id Anime ID (can be anilistId as number or tmdbId as number)
 * @returns Anime data or null if not found
 */
export async function getAnimeById(id: string | number): Promise<Anime | null> {
  // Authentication errors should be thrown immediately
  if (!(await validateCookie())) {
    fail('Unauthorized access to anime details')
    throw new Error('Unauthorized')
  }

  try {
    // Get all anime from cache only (read-only, no update)
    // This avoids triggering external API requests when accessing detail pages
    const animeList = await getAnimeListFromCache()

    // Try to find by anilistId first (if id is a number)
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id
    if (!isNaN(numericId)) {
      const animeByAnilistId = animeList.find((a) => a.anilistId === numericId)
      if (animeByAnilistId) {
        return animeByAnilistId
      }

      // Try to find by tmdbId
      const animeByTmdbId = animeList.find((a) => a.tmdbId === numericId)
      if (animeByTmdbId) {
        return animeByTmdbId
      }
    }

    return null
  } catch (error) {
    fail('getAnimeById - Error:', error)
    throw error
  }
}
