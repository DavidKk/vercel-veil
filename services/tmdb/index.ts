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
 * Fetch movie genres list from TMDB (with cache)
 * Results are cached by fetchJsonWithCache to reduce API requests
 */
export async function fetchMovieGenres(): Promise<Map<number, string>> {
  const apiKey = getTmdbApiKey()
  const language = process.env.TMDB_LANGUAGE ?? 'zh-CN'

  info('Fetching movie genres from TMDB')
  const apiUrl = `${TMDB.API_BASE_URL}/genre/movie/list?api_key=${apiKey}&language=${language}`
  const data = await fetchJsonWithCache<TMDBGenresResponse>(apiUrl, {
    headers: {
      accept: 'application/json',
    },
    cacheDuration: 60 * 1000, // 1 minute
  })
  const genresMap = new Map(data.genres.map((genre) => [genre.id, genre.name]))
  info(`Fetched ${genresMap.size} movie genres from TMDB`)
  return genresMap
}

/**
 * Convert genre IDs to genre names
 */
export async function getGenreNames(genreIds: number[]): Promise<string[]> {
  if (!genreIds || genreIds.length === 0) {
    return []
  }

  const genresMap = await fetchMovieGenres()
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
 * Returns movies released from 2 weeks ago to today with rating >= 7.0
 */
export async function fetchPopularMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

  // Calculate date range: 2 weeks ago to today
  const today = new Date()
  const twoWeeksAgo = new Date()
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

  const dateGte = twoWeeksAgo.toISOString().split('T')[0] // YYYY-MM-DD
  const dateLte = today.toISOString().split('T')[0] // YYYY-MM-DD

  info(`Fetching popular movies from TMDB (page=${page}, date range: ${dateGte} to ${dateLte}, rating >= 7.0)`)

  const params = new URLSearchParams({
    api_key: apiKey,
    language,
    page: String(page),
    sort_by: 'popularity.desc',
    'primary_release_date.gte': dateGte,
    'primary_release_date.lte': dateLte,
    'vote_average.gte': '7.0',
  })

  if (options.region) {
    params.set('region', options.region)
  }

  const apiUrl = `${TMDB.API_BASE_URL}/discover/movie?${params.toString()}`
  const data = await fetchJsonWithCache<TMDBMoviesResponse>(apiUrl, {
    headers: {
      accept: 'application/json',
    },
    cacheDuration: 60 * 1000, // 1 minute
  })
  if (!data || !data.results) {
    throw new Error(`TMDB fetch popular movies: invalid response structure`)
  }
  info(`Fetched ${data.results.length} popular movies from TMDB`)
  return data.results
}

/**
 * Fetch upcoming movies from TMDB
 * Returns movies scheduled to be released in the next month (30 days)
 */
export async function fetchUpcomingMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

  // Calculate date range: today to 1 month from now
  const today = new Date()
  const oneMonthLater = new Date()
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)

  const dateGte = today.toISOString().split('T')[0] // YYYY-MM-DD
  const dateLte = oneMonthLater.toISOString().split('T')[0] // YYYY-MM-DD

  info(`Fetching upcoming movies from TMDB (page=${page}, date range: ${dateGte} to ${dateLte})`)

  const params = new URLSearchParams({
    api_key: apiKey,
    language,
    page: String(page),
    sort_by: 'popularity.desc',
    'primary_release_date.gte': dateGte,
    'primary_release_date.lte': dateLte,
  })

  if (options.region) {
    params.set('region', options.region)
  }

  const apiUrl = `${TMDB.API_BASE_URL}/discover/movie?${params.toString()}`
  const data = await fetchJsonWithCache<TMDBMoviesResponse>(apiUrl, {
    headers: {
      accept: 'application/json',
    },
    cacheDuration: 60 * 1000, // 1 minute
  })
  if (!data || !data.results) {
    throw new Error(`TMDB fetch upcoming movies: invalid response structure`)
  }
  info(`Fetched ${data.results.length} upcoming movies from TMDB`)
  return data.results
}

/**
 * Discover movies with date range filter
 */
export async function discoverMovies(options: FetchMoviesOptions = {}): Promise<TMDBMovie[]> {
  const apiKey = getTmdbApiKey()
  const language = options.language ?? process.env.TMDB_LANGUAGE ?? 'zh-CN'
  const page = options.page ?? 1

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
  const data = await fetchJsonWithCache<TMDBMoviesResponse>(apiUrl, {
    headers: {
      accept: 'application/json',
    },
    cacheDuration: 60 * 1000, // 1 minute
  })
  info(`Discovered ${data.results.length} movies from TMDB`)
  return data.results
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

/**
 * Get TV series details with fallback language for overview
 * Results are cached according to TMDB_CACHE.MOVIE_DETAILS to reduce API requests
 */
export async function getTVDetails(tvId: number, preferredLanguage = 'zh-CN'): Promise<{ overview?: string; name?: string; [key: string]: any } | null> {
  const apiKey = getTmdbApiKey()

  try {
    // First try with preferred language (cached)
    const apiUrl = `${TMDB.API_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=${preferredLanguage}`
    let data = await fetchJsonWithCache<{ overview?: string; name?: string; [key: string]: any }>(apiUrl, {
      headers: {
        accept: 'application/json',
      },
      cacheDuration: TMDB_CACHE.MOVIE_DETAILS,
    })

    if (!data) {
      fail(`TMDB get TV details failed for TV ${tvId}`)
      return null
    }

    // If overview is empty and preferred language is not English, try English (cached)
    if ((!data.overview || data.overview.trim() === '') && preferredLanguage !== 'en-US' && preferredLanguage !== 'en') {
      info(`TV ${tvId} has no overview in ${preferredLanguage}, trying English`)
      const enApiUrl = `${TMDB.API_BASE_URL}/tv/${tvId}?api_key=${apiKey}&language=en-US`
      const enData = await fetchJsonWithCache<{ overview?: string; name?: string; [key: string]: any }>(enApiUrl, {
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
    fail(`TMDB get TV details error for TV ${tvId}:`, error)
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

    const data = await fetchJsonWithCache<{ id: number; username?: string }>(apiUrl, {
      headers: {
        accept: 'application/json',
      },
      cacheDuration: 60 * 1000, // 1 minute
    })

    info('Successfully fetched TMDB account info')
    return { accountId: data.id }
  } catch (error) {
    if (error instanceof Error && error.message.includes('HTTP error')) {
      const statusMatch = error.message.match(/Status: (\d+)/)
      if (statusMatch) {
        const status = parseInt(statusMatch[1], 10)
        if (status === 401) {
          throw new Error('TMDB Session ID is invalid or expired, please get a new Session ID')
        } else if (status === 403) {
          throw new Error('TMDB API Key is invalid or unauthorized, please check API Key configuration')
        }
      }
      return null
    }
    // For network timeout/connection errors, use warn instead of fail
    // These are temporary issues and shouldn't block functionality
    const isTimeoutError =
      error instanceof Error &&
      (error.message.includes('timeout') ||
        error.message.includes('TIMEOUT') ||
        error.message.includes('Connect Timeout') ||
        error.message.includes('fetch failed') ||
        (error.cause && typeof error.cause === 'object' && 'code' in error.cause && error.cause.code === 'UND_ERR_CONNECT_TIMEOUT'))
    if (isTimeoutError) {
      warn('TMDB get account info timeout (network issue, will retry later):', error instanceof Error ? error.message : String(error))
    } else {
      fail('TMDB get account info error:', error)
    }
    return null
  }
}

/**
 * Get user's favorite TV series list
 * @returns Set of favorite TV IDs
 */
export async function getFavoriteTVs(): Promise<Set<number>> {
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
    fail('TMDB get favorite TVs error - failed to get account info:', error)
    return new Set()
  }

  if (!accountInfo) {
    return new Set()
  }

  try {
    const apiUrl = `${TMDB.API_BASE_URL}/account/${accountInfo.accountId}/favorite/tv?api_key=${apiKey}&session_id=${sessionId}`

    const favoriteIds = new Set<number>()
    let page = 1
    let totalPages = 1

    do {
      const data = await fetchJsonWithCache<{
        page: number
        results: Array<{ id: number }>
        total_pages: number
        total_results: number
      }>(`${apiUrl}&page=${page}`, {
        headers: {
          accept: 'application/json',
        },
        cacheDuration: 60 * 1000, // 1 minute
      })

      data.results.forEach((tv) => {
        favoriteIds.add(tv.id)
      })

      totalPages = data.total_pages
      page++
    } while (page <= totalPages)

    info(`Successfully fetched ${favoriteIds.size} favorite TV series`)
    return favoriteIds
  } catch (error) {
    fail('TMDB get favorite TVs error:', error)
    return new Set()
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

    const favoriteIds = new Set<number>()
    let page = 1
    let totalPages = 1

    do {
      const data = await fetchJsonWithCache<{
        page: number
        results: Array<{ id: number }>
        total_pages: number
        total_results: number
      }>(`${apiUrl}&page=${page}`, {
        headers: {
          accept: 'application/json',
        },
        cacheDuration: 60 * 1000, // 1 minute
      })

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
 * Add TV series to favorites list
 * @param tvId TMDB TV ID
 * @param favorite Whether to favorite (true=add, false=remove)
 */
export async function addTVToFavorites(tvId: number, favorite = true): Promise<boolean> {
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
    const apiUrl = `${TMDB.API_BASE_URL}/account/${accountInfo.accountId}/favorite?api_key=${apiKey}&session_id=${sessionId}`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        media_type: 'tv',
        media_id: tvId,
        favorite,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      const limitedErrorText = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText
      fail(`TMDB add TV to favorites failed: status=${response.status} ${response.statusText}, body=${limitedErrorText}`)
      throw new Error(`Failed to ${favorite ? 'add' : 'remove'} TV from favorites: ${response.statusText}`)
    }

    const data = (await response.json()) as { status_code: number; status_message: string }
    if (data.status_code === 1 || data.status_code === 12 || data.status_code === 13) {
      return true
    }

    throw new Error(data.status_message || 'Unknown error')
  } catch (error) {
    fail('TMDB add TV to favorites error:', error)
    throw error
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
    // If getAccountInfo has already thrown a detailed error, rethrow it directly
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
      // Limit error body length to avoid logging sensitive information
      const limitedErrorText = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText
      fail(`TMDB add to favorites failed: status=${response.status} ${response.statusText}, body=${limitedErrorText}`)
      throw new Error(`Failed to ${favorite ? 'add' : 'remove'} movie from favorites: ${response.statusText}`)
    }

    const data = (await response.json()) as { status_code: number; status_message: string }
    if (data.status_code === 1 || data.status_code === 12 || data.status_code === 13) {
      return true
    }

    throw new Error(data.status_message || 'Unknown error')
  } catch (error) {
    fail('TMDB add to favorites error:', error)
    throw error
  }
}
