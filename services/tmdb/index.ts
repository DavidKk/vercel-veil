import { fetchJsonWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'
import { getTmdbApiKey, getTmdbSessionId, hasTmdbAuth } from '@/services/tmdb/env'

import { TMDB, TMDB_CACHE } from './constants'
import type { SearchResult } from './types'

/**
 * TMDB Genre interface
 */
export interface TMDBGenre {
  id: number
  name: string
}

export interface TMDBGenresResponse {
  genres: TMDBGenre[]
}

/**
 * Cache for movie genres (lazy loaded)
 */
let movieGenresCache: Map<number, string> | null = null

/**
 * Get movie genres list from TMDB and cache it
 */
export async function getMovieGenres(): Promise<Map<number, string>> {
  if (movieGenresCache) {
    return movieGenresCache
  }

  const apiKey = getTmdbApiKey()
  const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'

  try {
    info('Fetching movie genres from TMDB')
    const apiUrl = `${TMDB.API_BASE_URL}/genre/movie/list?api_key=${apiKey}&language=${language}`
    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      fail(`TMDB fetch movie genres failed: status=${response.status} ${response.statusText}`)
      return new Map()
    }

    const data = (await response.json()) as TMDBGenresResponse
    movieGenresCache = new Map(data.genres.map((genre) => [genre.id, genre.name]))
    info(`Fetched ${movieGenresCache.size} movie genres from TMDB`)
    return movieGenresCache
  } catch (error) {
    fail('TMDB fetch movie genres error:', error)
    return new Map()
  }
}

/**
 * Convert genre IDs to genre names
 */
export async function getGenreNames(genreIds: number[]): Promise<string[]> {
  if (!genreIds || genreIds.length === 0) {
    return []
  }

  const genresMap = await getMovieGenres()
  return genreIds.map((id) => genresMap.get(id) || '').filter((name) => name !== '')
}

export interface SearchResponse {
  page: number
  results: SearchResult[]
  total_pages: number
  total_results: number
}

export interface SearchOptions {
  language?: string
  region?: string
}

/**
 * TMDB Movie response interface
 */
export interface TMDBMovie {
  id: number
  title: string
  overview?: string
  poster_path?: string | null
  backdrop_path?: string | null
  release_date?: string
  vote_average?: number
  vote_count?: number
  popularity?: number
  adult?: boolean
  original_language?: string
  original_title?: string
  genre_ids?: number[]
}

export interface TMDBMoviesResponse {
  page: number
  results: TMDBMovie[]
  total_pages: number
  total_results: number
}

/**
 * Options for fetching TMDB movies
 */
export interface FetchMoviesOptions extends SearchOptions {
  page?: number
  region?: string
  primary_release_date_gte?: string // Format: YYYY-MM-DD
  primary_release_date_lte?: string // Format: YYYY-MM-DD
}

/**
 * Fetch popular movies from TMDB
 */
export async function fetchPopularMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

  try {
    info(`Fetching popular movies from TMDB (page=${page})`)

    const params = new URLSearchParams({
      api_key: apiKey,
      language,
      page: String(page),
    })

    if (options.region) {
      params.set('region', options.region)
    }

    const apiUrl = `${TMDB.API_BASE_URL}/movie/popular?${params.toString()}`
    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      fail(`TMDB fetch popular movies failed: status=${response.status} ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as TMDBMoviesResponse
    info(`Fetched ${data.results.length} popular movies from TMDB`)
    return data.results
  } catch (error) {
    fail('TMDB fetch popular movies error:', error)
    return []
  }
}

/**
 * Fetch upcoming movies from TMDB
 * Returns movies scheduled to be released in the next 4 weeks (28 days)
 * This matches the default behavior on https://www.themoviedb.org/movie/upcoming
 */
export async function fetchUpcomingMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

  try {
    info(`Fetching upcoming movies from TMDB (page=${page})`)

    const params = new URLSearchParams({
      api_key: apiKey,
      language,
      page: String(page),
    })

    if (options.region) {
      params.set('region', options.region)
    }

    const apiUrl = `${TMDB.API_BASE_URL}/movie/upcoming?${params.toString()}`
    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      fail(`TMDB fetch upcoming movies failed: status=${response.status} ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as TMDBMoviesResponse
    info(`Fetched ${data.results.length} upcoming movies from TMDB`)
    return data.results
  } catch (error) {
    fail('TMDB fetch upcoming movies error:', error)
    return []
  }
}

/**
 * Fetch now playing movies from TMDB
 */
export async function fetchNowPlayingMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

  try {
    info(`Fetching now playing movies from TMDB (page=${page})`)

    const params = new URLSearchParams({
      api_key: apiKey,
      language,
      page: String(page),
    })

    if (options.region) {
      params.set('region', options.region)
    }

    const apiUrl = `${TMDB.API_BASE_URL}/movie/now_playing?${params.toString()}`
    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      fail(`TMDB fetch now playing movies failed: status=${response.status} ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as TMDBMoviesResponse
    info(`Fetched ${data.results.length} now playing movies from TMDB`)
    return data.results
  } catch (error) {
    fail('TMDB fetch now playing movies error:', error)
    return []
  }
}

/**
 * Discover movies with date range filter
 */
export async function discoverMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

  try {
    info(`Discovering movies from TMDB (page=${page})`)

    const params = new URLSearchParams({
      api_key: apiKey,
      language,
      page: String(page),
      sort_by: 'popularity.desc',
    })

    if (options.region) {
      params.set('region', options.region)
    }

    if (options.primary_release_date_gte) {
      params.set('primary_release_date.gte', options.primary_release_date_gte)
    }

    if (options.primary_release_date_lte) {
      params.set('primary_release_date.lte', options.primary_release_date_lte)
    }

    const apiUrl = `${TMDB.API_BASE_URL}/discover/movie?${params.toString()}`
    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      fail(`TMDB discover movies failed: status=${response.status} ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as TMDBMoviesResponse
    info(`Discovered ${data.results.length} movies from TMDB`)
    return data.results
  } catch (error) {
    fail('TMDB discover movies error:', error)
    return []
  }
}

/**
 * Get movie details with fallback language for overview
 * Results are cached according to TMDB_CACHE.MOVIE_DETAILS to reduce API requests
 */
export async function getMovieDetails(movieId: number, preferredLanguage = 'zh-CN'): Promise<{ overview?: string; [key: string]: any } | null> {
  const apiKey = getTmdbApiKey()

  try {
    // First try with preferred language (cached)
    const apiUrl = `${TMDB.API_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=${preferredLanguage}`
    let data = await fetchJsonWithCache<{ overview?: string; [key: string]: any }>(apiUrl, {
      headers: {
        accept: 'application/json',
      },
      cacheDuration: TMDB_CACHE.MOVIE_DETAILS,
    })

    if (!data) {
      fail(`TMDB get movie details failed for movie ${movieId}`)
      return null
    }

    // If overview is empty and preferred language is not English, try English (cached)
    if ((!data.overview || data.overview.trim() === '') && preferredLanguage !== 'en-US' && preferredLanguage !== 'en') {
      info(`Movie ${movieId} has no overview in ${preferredLanguage}, trying English`)
      const enApiUrl = `${TMDB.API_BASE_URL}/movie/${movieId}?api_key=${apiKey}&language=en-US`
      const enData = await fetchJsonWithCache<{ overview?: string; [key: string]: any }>(enApiUrl, {
        headers: {
          accept: 'application/json',
        },
        cacheDuration: TMDB_CACHE.MOVIE_DETAILS,
      })

      if (enData?.overview && enData.overview.trim() !== '') {
        data.overview = enData.overview
      }
    }

    return data
  } catch (error) {
    fail(`TMDB get movie details error for movie ${movieId}:`, error)
    return null
  }
}

export async function searchMulti(title: string, options: SearchOptions = {}): Promise<SearchResult[] | null> {
  const apiKey = getTmdbApiKey()

  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const region = options.region ?? process.env.TMDB_REGION

  try {
    info(`TMDB search start: ${title}`)

    const params = new URLSearchParams({
      api_key: apiKey,
      query: title,
      include_adult: 'false',
      language,
    })

    if (region) {
      params.set('region', region)
    }

    const apiUrl = `${TMDB.API_BASE_URL}/search/multi?${params.toString()}`
    const data = await fetchJsonWithCache<SearchResponse>(apiUrl, {
      headers: {
        accept: 'application/json',
      },
      cacheDuration: TMDB_CACHE.SEARCH,
    })

    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      warn(`TMDB search empty result for "${title}"`)
      return []
    }

    info(`TMDB search success: ${title}, results=${data.results.length}`)
    return data.results
  } catch (error) {
    fail(`TMDB search error for "${title}":`, error)
    return null
  }
}

/**
 * Get session ID from environment variable
 */
function getSessionId(): string | null {
  return getTmdbSessionId() || null
}

/**
 * Get current logged-in user account information
 */
async function getAccountInfo(): Promise<{ accountId: number } | null> {
  const apiKey = getTmdbApiKey()
  const sessionId = getSessionId()

  if (!sessionId) {
    warn('TMDB_SESSION_ID is not configured, cannot get account info')
    return null
  }

  try {
    const apiUrl = `${TMDB.API_BASE_URL}/account?api_key=${apiKey}&session_id=${sessionId}`
    info(`Fetching TMDB account info with session_id: ${sessionId.substring(0, 8)}...`)

    const response = await fetch(apiUrl, {
      headers: {
        accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      fail(`TMDB get account info failed: status=${response.status} ${response.statusText}, body=${errorText}`)

      // Provide more detailed error information
      if (response.status === 401) {
        throw new Error('TMDB Session ID is invalid or expired, please get a new Session ID')
      } else if (response.status === 403) {
        throw new Error('TMDB API Key is invalid or unauthorized, please check API Key configuration')
      }

      return null
    }

    const data = (await response.json()) as { id: number; username?: string }
    info(`Successfully fetched TMDB account info: accountId=${data.id}, username=${data.username || 'N/A'}`)
    return { accountId: data.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Session ID')) {
      throw error
    }
    fail('TMDB get account info error:', error)
    return null
  }
}

/**
 * Get user's favorite movies list
 * @returns Set of favorite movie IDs
 */
export async function getFavoriteMovies(): Promise<Set<number>> {
  const apiKey = getTmdbApiKey()

  if (!hasTmdbAuth()) {
    return new Set()
  }

  const sessionId = getSessionId()
  if (!sessionId) {
    return new Set()
  }

  let accountInfo: { accountId: number } | null
  try {
    accountInfo = await getAccountInfo()
  } catch (error) {
    fail('TMDB get favorite movies error - failed to get account info:', error)
    return new Set()
  }

  if (!accountInfo) {
    return new Set()
  }

  try {
    const apiUrl = `${TMDB.API_BASE_URL}/account/${accountInfo.accountId}/favorite/movies?api_key=${apiKey}&session_id=${sessionId}`
    info(`Fetching TMDB favorite movies for account ${accountInfo.accountId}`)

    const favoriteIds = new Set<number>()
    let page = 1
    let totalPages = 1

    do {
      const response = await fetch(`${apiUrl}&page=${page}`, {
        headers: {
          accept: 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        fail(`TMDB get favorite movies failed: status=${response.status} ${response.statusText}, body=${errorText}`)
        break
      }

      const data = (await response.json()) as {
        page: number
        results: Array<{ id: number }>
        total_pages: number
        total_results: number
      }

      data.results.forEach((movie) => {
        favoriteIds.add(movie.id)
      })

      totalPages = data.total_pages
      page++
    } while (page <= totalPages)

    info(`Successfully fetched ${favoriteIds.size} favorite movies`)
    return favoriteIds
  } catch (error) {
    fail('TMDB get favorite movies error:', error)
    return new Set()
  }
}

/**
 * Add movie to favorites list
 * @param movieId TMDB movie ID
 * @param favorite Whether to favorite (true=add, false=remove)
 */
export async function addToFavorites(movieId: number, favorite = true): Promise<boolean> {
  const apiKey = getTmdbApiKey()

  if (!hasTmdbAuth()) {
    throw new Error('TMDB authentication not configured. Favorite feature requires TMDB_SESSION_ID. ' + 'Please set TMDB_SESSION_ID environment variable or skip this feature.')
  }

  const sessionId = getSessionId()
  if (!sessionId) {
    throw new Error('Failed to get TMDB session ID. Please check your TMDB_SESSION_ID configuration.')
  }

  let accountInfo: { accountId: number } | null
  try {
    accountInfo = await getAccountInfo()
  } catch (error) {
    // 如果 getAccountInfo 已经抛出了详细的错误，直接重新抛出
    throw error
  }

  if (!accountInfo) {
    throw new Error(
      'Failed to get TMDB account information. Please check:\n' +
        '1. TMDB_SESSION_ID is correctly configured\n' +
        '2. Session ID is valid (may be expired, need to get a new one)\n' +
        '3. TMDB_API_KEY is correctly configured\n' +
        '4. Network connection is normal'
    )
  }

  try {
    info(`Adding movie ${movieId} to favorites: ${favorite}`)

    const apiUrl = `${TMDB.API_BASE_URL}/account/${accountInfo.accountId}/favorite?api_key=${apiKey}&session_id=${sessionId}`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        media_type: 'movie',
        media_id: movieId,
        favorite,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      fail(`TMDB add to favorites failed: status=${response.status} ${response.statusText}, body=${errorText}`)
      throw new Error(`Failed to ${favorite ? 'add' : 'remove'} movie from favorites: ${response.statusText}`)
    }

    const data = (await response.json()) as { status_code: number; status_message: string }
    if (data.status_code === 1 || data.status_code === 12 || data.status_code === 13) {
      info(`Successfully ${favorite ? 'added' : 'removed'} movie ${movieId} to/from favorites`)
      return true
    }

    throw new Error(data.status_message || 'Unknown error')
  } catch (error) {
    fail(`TMDB add to favorites error for movie ${movieId}:`, error)
    throw error
  }
}
