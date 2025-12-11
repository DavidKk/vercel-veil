import { fetchJsonWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'
import type { TMDBMovie } from '@/services/tmdb'
import { fetchMovieGenres, fetchPopularMovies, fetchUpcomingMovies, getGenreNames, getMovieDetails, searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'

import { MAOYAN, MAOYAN_CACHE } from './constants'
import type { ComingMovie, MergedMovie, MostExpectedResponse, MovieListItem, TopRatedMoviesResponse } from './types'

/**
 * Fetch top rated movies list (without cache)
 * Internal use for GIST cache system
 * @throws Error if fetch fails
 */
async function fetchTopRatedMoviesWithoutCache(): Promise<MovieListItem[]> {
  info('Fetching top rated movies from Maoyan (no cache)')
  const data = await fetchJsonWithCache<TopRatedMoviesResponse>(`${MAOYAN.API_BASE}/index/topRatedMovies`, {
    headers: {
      'User-Agent': MAOYAN.USER_AGENT,
    },
    cacheDuration: 0, // No cache for this function
  })
  info(`Fetched ${data.movieList?.length || 0} top rated movies (no cache)`)
  return data.movieList || []
}

/**
 * Fetch top rated movies list
 * Results are cached according to MAOYAN_CACHE.TOP_RATED_MOVIES to reduce API requests
 * @throws Error if fetch fails
 */
export async function fetchTopRatedMovies(): Promise<MovieListItem[]> {
  info('Fetching top rated movies from Maoyan')
  const data = await fetchJsonWithCache<TopRatedMoviesResponse>(`${MAOYAN.API_BASE}/index/topRatedMovies`, {
    headers: {
      'User-Agent': MAOYAN.USER_AGENT,
    },
    cacheDuration: MAOYAN_CACHE.TOP_RATED_MOVIES,
  })

  info(`Fetched ${data.movieList?.length || 0} top rated movies`)
  return data.movieList || []
}

/**
 * Fetch most expected movies list (without cache)
 * Internal use for GIST cache system
 * @throws Error if fetch fails
 */
async function fetchMostExpectedWithoutCache(limit = 20, offset = 0): Promise<ComingMovie[]> {
  info(`Fetching most expected movies from Maoyan (no cache, limit=${limit}, offset=${offset})`)
  const data = await fetchJsonWithCache<MostExpectedResponse>(`${MAOYAN.API_BASE}/index/mostExpected?ci=1&limit=${limit}&offset=${offset}`, {
    headers: {
      'User-Agent': MAOYAN.USER_AGENT,
    },
    cacheDuration: 0, // No cache for this function
  })
  info(`Fetched ${data.coming?.length || 0} most expected movies (no cache)`)
  return data.coming || []
}

/**
 * Fetch most expected movies list
 * Results are cached according to MAOYAN_CACHE.MOST_EXPECTED to reduce API requests
 * @throws Error if fetch fails
 */
export async function fetchMostExpected(limit = 20, offset = 0): Promise<ComingMovie[]> {
  info(`Fetching most expected movies from Maoyan (limit=${limit}, offset=${offset})`)
  const data = await fetchJsonWithCache<MostExpectedResponse>(`${MAOYAN.API_BASE}/index/mostExpected?ci=1&limit=${limit}&offset=${offset}`, {
    headers: {
      'User-Agent': MAOYAN.USER_AGENT,
    },
    cacheDuration: MAOYAN_CACHE.MOST_EXPECTED,
  })

  info(`Fetched ${data.coming?.length || 0} most expected movies`)
  return data.coming || []
}

/**
 * Enrich a single movie with basic TMDB search result
 * Returns the movie with TMDB ID and basic info, and indicates if details are needed
 */
async function enrichMovieWithSearchResult(movie: MergedMovie): Promise<{ movie: MergedMovie; needsDetails: boolean; genreIds: number[] }> {
  if (!hasTmdbApiKey()) {
    return { movie, needsDetails: false, genreIds: [] }
  }

  try {
    const results = await searchMulti(movie.name, { language: 'zh-CN' })

    if (!results || results.length === 0) {
      return { movie, needsDetails: false, genreIds: [] }
    }

    // Prefer movie type results
    const movieResult = results.find((r) => r.media_type === 'movie') ?? results[0]

    if (movieResult.id && movieResult.media_type === 'movie') {
      movie.tmdbId = movieResult.id
      movie.tmdbUrl = `https://www.themoviedb.org/movie/${movieResult.id}`

      if (movieResult.poster_path) {
        movie.tmdbPoster = `https://image.tmdb.org/t/p/w500${movieResult.poster_path}`
      }

      // Check if we need to fetch details for overview
      const needsDetails = !movieResult.overview || movieResult.overview.trim() === ''

      if (!needsDetails) {
        movie.overview = movieResult.overview
      }

      if ('release_date' in movieResult && movieResult.release_date) {
        movie.releaseDate = movieResult.release_date
        const yearMatch = movieResult.release_date.match(/^(\d{4})/)
        if (yearMatch) {
          movie.year = parseInt(yearMatch[1], 10)
        }
      }

      if ('vote_average' in movieResult && movieResult.vote_average) {
        movie.rating = movieResult.vote_average
      }

      if ('vote_count' in movieResult && movieResult.vote_count) {
        movie.tmdbVoteCount = movieResult.vote_count
      }

      if ('popularity' in movieResult && movieResult.popularity) {
        movie.popularity = movieResult.popularity
      }

      const genreIds = movieResult.genre_ids || []

      return { movie, needsDetails, genreIds }
    }
  } catch (error) {
    fail(`Error searching TMDB for "${movie.name}":`, error)
  }

  return { movie, needsDetails: false, genreIds: [] }
}

/**
 * Batch enrich movies with TMDB information
 * Optimizes API calls by batching requests and reducing redundant calls
 * @param movies Movies to enrich
 * @param tmdbTitleMap Optional map of movie titles to TMDB movies (from already fetched lists) to avoid unnecessary searches
 */
async function batchEnrichMoviesWithTMDB(movies: MergedMovie[], tmdbTitleMap?: Map<string, TMDBMovie>): Promise<MergedMovie[]> {
  if (!hasTmdbApiKey() || movies.length === 0) {
    return movies
  }

  info(`Batch enriching ${movies.length} movies with TMDB data`)

  // Step 1: Try to match movies with already fetched TMDB data first
  const moviesToSearch: Array<{ movie: MergedMovie; index: number }> = []
  const enrichedMovies: MergedMovie[] = []

  if (tmdbTitleMap) {
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i]
      // Try to find matching TMDB movie using fuzzy matching
      let tmdbMovie: TMDBMovie | undefined

      // First try exact match
      const exactKey = movie.name.toLowerCase().trim()
      tmdbMovie = tmdbTitleMap.get(exactKey)

      // If not found, try fuzzy match using normalized title
      if (!tmdbMovie) {
        const normalizedName = normalizeTitle(movie.name)
        for (const [title, tmdb] of tmdbTitleMap.entries()) {
          if (normalizeTitle(title) === normalizedName) {
            tmdbMovie = tmdb
            break
          }
        }
      }

      if (tmdbMovie) {
        // Use existing TMDB data
        const enriched: MergedMovie = {
          ...movie,
          tmdbId: tmdbMovie.id,
          tmdbUrl: `https://www.themoviedb.org/movie/${tmdbMovie.id}`,
        }

        if (tmdbMovie.poster_path) {
          enriched.tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        }

        if (tmdbMovie.overview && tmdbMovie.overview.trim() !== '') {
          enriched.overview = tmdbMovie.overview
        }

        if (tmdbMovie.release_date) {
          enriched.releaseDate = tmdbMovie.release_date
          const yearMatch = tmdbMovie.release_date.match(/^(\d{4})/)
          if (yearMatch) {
            enriched.year = parseInt(yearMatch[1], 10)
          }
        }

        if (tmdbMovie.vote_average) {
          enriched.rating = tmdbMovie.vote_average
        }

        if (tmdbMovie.vote_count) {
          enriched.tmdbVoteCount = tmdbMovie.vote_count
        }

        if (tmdbMovie.popularity) {
          enriched.popularity = tmdbMovie.popularity
        }

        enrichedMovies[i] = enriched
      } else {
        // Need to search
        moviesToSearch.push({ movie, index: i })
        enrichedMovies[i] = movie
      }
    }
  } else {
    // No pre-fetched data, need to search all
    for (let i = 0; i < movies.length; i++) {
      moviesToSearch.push({ movie: movies[i], index: i })
      enrichedMovies[i] = movies[i]
    }
  }

  // Step 2: Parallel search for movies that weren't matched
  const searchResults = await Promise.allSettled(moviesToSearch.map(({ movie }) => enrichMovieWithSearchResult(movie)))

  // Step 3: Process search results and collect movies that need details
  const moviesNeedingDetails: Array<{ movie: MergedMovie; originalIndex: number }> = []
  const movieGenreMap = new Map<number, number[]>() // original index -> genre IDs
  const allGenreIds = new Set<number>()

  for (let i = 0; i < searchResults.length; i++) {
    const result = searchResults[i]
    const searchItem = moviesToSearch[i]

    if (result.status === 'fulfilled') {
      const { movie, needsDetails, genreIds } = result.value
      enrichedMovies[searchItem.index] = movie

      if (needsDetails && movie.tmdbId) {
        moviesNeedingDetails.push({ movie, originalIndex: searchItem.index })
      }

      if (genreIds.length > 0) {
        movieGenreMap.set(searchItem.index, genreIds)
        genreIds.forEach((id) => allGenreIds.add(id))
      }
    }
  }

  // Step 4: Batch fetch movie details in parallel (only for movies that need it)
  if (moviesNeedingDetails.length > 0) {
    info(`Fetching details for ${moviesNeedingDetails.length} movies in parallel`)
    const detailsResults = await Promise.allSettled(moviesNeedingDetails.map(({ movie }) => getMovieDetails(movie.tmdbId!, 'zh-CN')))

    for (let i = 0; i < detailsResults.length; i++) {
      const result = detailsResults[i]
      if (result.status === 'fulfilled' && result.value?.overview) {
        const { originalIndex } = moviesNeedingDetails[i]
        enrichedMovies[originalIndex].overview = result.value.overview
      }
    }
  }

  // Step 5: Batch get all genre names (ensures genre cache is populated)
  if (allGenreIds.size > 0) {
    const genreIdsArray = Array.from(allGenreIds)
    // This will use the cached genre map, so it's efficient even if called multiple times
    await getGenreNames(genreIdsArray)
  }

  // Step 6: Apply genre names to movies
  if (movieGenreMap.size > 0) {
    const genresMap = await fetchMovieGenres()
    for (const [movieIndex, genreIds] of movieGenreMap.entries()) {
      if (enrichedMovies[movieIndex]) {
        enrichedMovies[movieIndex].genres = genreIds.map((id) => genresMap.get(id) || '').filter((name) => name !== '')
      }
    }
  }

  const enrichedCount = enrichedMovies.filter((m) => m.tmdbId).length
  info(`Batch enrichment completed: ${enrichedCount}/${movies.length} movies enriched with TMDB data`)
  return enrichedMovies
}

/**
 * Convert TMDB movie to MergedMovie format
 */
async function convertTMDBMovieToMergedMovie(tmdbMovie: TMDBMovie, source: 'tmdbPopular' | 'tmdbUpcoming'): Promise<MergedMovie> {
  const movie: MergedMovie = {
    maoyanId: `tmdb-${tmdbMovie.id}`, // Use TMDB ID as identifier
    name: tmdbMovie.title,
    poster: tmdbMovie.poster_path ? `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}` : '',
    source,
    sources: [source],
    tmdbId: tmdbMovie.id,
    tmdbUrl: `https://www.themoviedb.org/movie/${tmdbMovie.id}`,
  }

  if (tmdbMovie.poster_path) {
    movie.tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
  }

  // Set overview, with fallback to English if Chinese is empty
  if (tmdbMovie.overview && tmdbMovie.overview.trim() !== '') {
    movie.overview = tmdbMovie.overview
  } else {
    // If Chinese overview is empty, try to get English overview
    try {
      const movieDetails = await getMovieDetails(tmdbMovie.id, 'zh-CN')
      if (movieDetails?.overview && movieDetails.overview.trim() !== '') {
        movie.overview = movieDetails.overview
      }
    } catch (error) {
      warn(`Failed to get movie details for "${tmdbMovie.title}":`, error)
    }
  }

  if (tmdbMovie.release_date) {
    movie.releaseDate = tmdbMovie.release_date
    const yearMatch = tmdbMovie.release_date.match(/^(\d{4})/)
    if (yearMatch) {
      movie.year = parseInt(yearMatch[1], 10)
    }
  }

  if (tmdbMovie.vote_average) {
    movie.rating = tmdbMovie.vote_average
  }

  if (tmdbMovie.vote_count) {
    movie.tmdbVoteCount = tmdbMovie.vote_count
  }

  if (tmdbMovie.popularity) {
    movie.popularity = tmdbMovie.popularity
  }

  // Get genre names from genre IDs
  if (tmdbMovie.genre_ids && tmdbMovie.genre_ids.length > 0) {
    try {
      movie.genres = await getGenreNames(tmdbMovie.genre_ids)
    } catch (error) {
      warn(`Failed to get genre names for movie ${tmdbMovie.id}:`, error)
    }
  }

  return movie
}

/**
 * Generate Maoyan movie URL from movie ID
 */
function getMaoyanUrl(maoyanId: number | string): string | undefined {
  // Only generate URL if maoyanId is a number (not a string like "tmdb-123")
  if (typeof maoyanId === 'number') {
    return `https://maoyan.com/films/${maoyanId}`
  }
  return undefined
}

/**
 * Normalize movie title for matching (remove punctuation, normalize spaces)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[，。！？、；：""''（）【】《》\s]+/g, ' ') // Replace Chinese and common punctuation with space
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // Remove other punctuation, keep Chinese characters, letters, numbers
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim()
}

/**
 * Find matching movie in map by title (fuzzy matching)
 */
function findMatchingMovie(movieMap: Map<string, MergedMovie>, title: string): MergedMovie | undefined {
  const normalizedTitle = normalizeTitle(title)

  // First try exact match
  for (const [key, movie] of movieMap.entries()) {
    if (normalizeTitle(key) === normalizedTitle) {
      return movie
    }
  }

  // Then try partial match (one contains the other)
  for (const [key, movie] of movieMap.entries()) {
    const normalizedKey = normalizeTitle(key)
    if (normalizedTitle.includes(normalizedKey) || normalizedKey.includes(normalizedTitle)) {
      return movie
    }
  }

  return undefined
}

/**
 * Merge TMDB movies into existing movie map
 * @param movieMap Map to merge movies into
 * @param tmdbMovies TMDB movies to merge
 * @param source Source type ('tmdbPopular' | 'tmdbUpcoming')
 * @param isFromNowPlaying Whether these movies are from now playing list (will be filtered by rating >= 7.0 and merged as upcoming)
 */
async function mergeTMDBMovies(movieMap: Map<string, MergedMovie>, tmdbMovies: TMDBMovie[], source: 'tmdbPopular' | 'tmdbUpcoming', isFromNowPlaying = false): Promise<void> {
  // Filter now playing movies by rating (>= 7.0) if needed
  const moviesToMerge = isFromNowPlaying ? tmdbMovies.filter((movie) => (movie.vote_average || 0) >= 7.0) : tmdbMovies

  // For now playing movies, merge them as upcoming
  const effectiveSource: 'tmdbPopular' | 'tmdbUpcoming' = isFromNowPlaying ? 'tmdbUpcoming' : source

  for (const tmdbMovie of moviesToMerge) {
    const key = tmdbMovie.title.toLowerCase().trim()
    const existing = findMatchingMovie(movieMap, tmdbMovie.title)

    if (existing) {
      // If exists, merge sources
      if (!existing.sources.includes(effectiveSource)) {
        existing.sources.push(effectiveSource)
      }
      // Update TMDB data if not already present
      if (!existing.tmdbId && tmdbMovie.id) {
        existing.tmdbId = tmdbMovie.id
        existing.tmdbUrl = `https://www.themoviedb.org/movie/${tmdbMovie.id}`
        if (tmdbMovie.poster_path) {
          existing.tmdbPoster = `https://image.tmdb.org/t/p/w500${tmdbMovie.poster_path}`
        }
        // Set overview, with fallback to English if Chinese is empty
        if (tmdbMovie.overview && tmdbMovie.overview.trim() !== '') {
          existing.overview = tmdbMovie.overview
        } else if (!existing.overview) {
          // If Chinese overview is empty and existing doesn't have overview, try to get English overview
          try {
            const movieDetails = await getMovieDetails(tmdbMovie.id, 'zh-CN')
            if (movieDetails?.overview && movieDetails.overview.trim() !== '') {
              existing.overview = movieDetails.overview
            }
          } catch (error) {
            warn(`Failed to get movie details for "${existing.name}":`, error)
          }
        }
        if (tmdbMovie.release_date) {
          existing.releaseDate = tmdbMovie.release_date
          const yearMatch = tmdbMovie.release_date.match(/^(\d{4})/)
          if (yearMatch) {
            existing.year = parseInt(yearMatch[1], 10)
          }
        }
        if (tmdbMovie.vote_average) {
          existing.rating = tmdbMovie.vote_average
        }

        if (tmdbMovie.vote_count) {
          existing.tmdbVoteCount = tmdbMovie.vote_count
        }

        if (tmdbMovie.popularity) {
          existing.popularity = tmdbMovie.popularity
        }
        // Get genre names from genre IDs
        if (tmdbMovie.genre_ids && tmdbMovie.genre_ids.length > 0) {
          try {
            existing.genres = await getGenreNames(tmdbMovie.genre_ids)
          } catch (error) {
            warn(`Failed to get genre names for movie "${existing.name}":`, error)
          }
        }
      }
    } else {
      // New movie from TMDB
      const newMovie = await convertTMDBMovieToMergedMovie(tmdbMovie, effectiveSource)
      movieMap.set(key, newMovie)
    }
  }
}

/**
 * Get and merge movie lists, enrich with TMDB information
 * @param options Options for fetching TMDB movies
 *   - includeTMDBPopular: Include popular movies from TMDB (default: true)
 *   - includeTMDBUpcoming: Include upcoming movies from TMDB, merged with now playing movies (default: true)
 *     Now playing movies with rating >= 7.0 will be included in upcoming list
 */
export interface GetMergedMoviesListOptions {
  includeTMDBPopular?: boolean
  includeTMDBUpcoming?: boolean
}

/**
 * Get merged movie list without request-level cache
 * Internal use for GIST cache system
 */
export async function getMergedMoviesListWithoutCache(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  info('Fetching and merging movie lists from Maoyan and TMDB (no request cache)')

  const { includeTMDBPopular = true, includeTMDBUpcoming = true } = options

  // Fetch Maoyan lists without cache (use allSettled for graceful error handling)
  const maoyanResults = await Promise.allSettled([fetchTopRatedMoviesWithoutCache(), fetchMostExpectedWithoutCache(20, 0)])

  const topRated = maoyanResults[0]?.status === 'fulfilled' ? maoyanResults[0].value : []
  const mostExpected = maoyanResults[1]?.status === 'fulfilled' ? maoyanResults[1].value : []

  if (maoyanResults[0]?.status === 'rejected') {
    fail('Failed to fetch top rated movies from Maoyan:', maoyanResults[0].reason)
  }
  if (maoyanResults[1]?.status === 'rejected') {
    fail('Failed to fetch most expected movies from Maoyan:', maoyanResults[1].reason)
  }

  // Merge Maoyan movies
  const movieMap = new Map<string, MergedMovie>()

  // Process top rated movies
  for (const movie of topRated) {
    const key = movie.name.toLowerCase().trim()
    movieMap.set(key, {
      maoyanId: movie.movieId,
      name: movie.name,
      poster: movie.poster,
      score: movie.score,
      source: 'topRated',
      sources: ['topRated'],
      maoyanUrl: getMaoyanUrl(movie.movieId),
    })
  }

  // Process most expected movies
  for (const movie of mostExpected) {
    const key = movie.nm.toLowerCase().trim()
    const existing = movieMap.get(key)

    if (existing) {
      if (!existing.sources.includes('mostExpected')) {
        existing.sources.push('mostExpected')
      }
      if (!existing.wish && movie.wish) {
        existing.wish = movie.wish
      }
      // Ensure maoyanUrl is set if not already present
      if (!existing.maoyanUrl) {
        existing.maoyanUrl = getMaoyanUrl(movie.id)
      }
    } else {
      movieMap.set(key, {
        maoyanId: movie.id,
        name: movie.nm,
        poster: movie.img,
        wish: movie.wish,
        source: 'mostExpected',
        sources: ['mostExpected'],
        maoyanUrl: getMaoyanUrl(movie.id),
      })
    }
  }

  info(`Merged ${movieMap.size} unique movies from Maoyan (${topRated.length} top rated + ${mostExpected.length} most expected)`)

  // Fetch TMDB movies if API key is available
  if (hasTmdbApiKey()) {
    const tmdbPromises: Promise<TMDBMovie[]>[] = []

    if (includeTMDBPopular) {
      tmdbPromises.push(fetchPopularMovies({ language: 'zh-CN', page: 1 }))
    }

    // Fetch upcoming movies
    if (includeTMDBUpcoming) {
      // TMDB's upcoming movies API returns movies scheduled to be released in the next month (30 days)
      tmdbPromises.push(fetchUpcomingMovies({ language: 'zh-CN', page: 1 }))
    }

    // Build a map of TMDB movies by title for efficient lookup
    const tmdbTitleMap = new Map<string, TMDBMovie>()

    if (tmdbPromises.length > 0) {
      info('Fetching TMDB movie lists')
      const tmdbResults = await Promise.allSettled(tmdbPromises)

      let tmdbIndex = 0
      if (includeTMDBPopular) {
        const result = tmdbResults[tmdbIndex]
        if (result?.status === 'fulfilled') {
          const movies = result.value
          if (movies && movies.length > 0) {
            await mergeTMDBMovies(movieMap, movies, 'tmdbPopular')
            // Add to title map for efficient lookup during enrichment
            for (const movie of movies) {
              const key = movie.title.toLowerCase().trim()
              if (!tmdbTitleMap.has(key)) {
                tmdbTitleMap.set(key, movie)
              }
            }
            info(`Merged ${movies.length} popular movies from TMDB`)
          } else {
            warn('TMDB popular movies returned empty array')
          }
        } else if (result?.status === 'rejected') {
          fail('TMDB popular movies request failed:', result.reason)
        }
        tmdbIndex++
      }

      if (includeTMDBUpcoming) {
        // Merge upcoming movies
        const upcomingResult = tmdbResults[tmdbIndex]
        if (upcomingResult?.status === 'fulfilled') {
          const movies = upcomingResult.value
          if (movies && movies.length > 0) {
            await mergeTMDBMovies(movieMap, movies, 'tmdbUpcoming')
            // Add to title map for efficient lookup during enrichment
            for (const movie of movies) {
              const key = movie.title.toLowerCase().trim()
              if (!tmdbTitleMap.has(key)) {
                tmdbTitleMap.set(key, movie)
              }
            }
            info(`Merged ${movies.length} upcoming movies from TMDB`)
          } else {
            warn('TMDB upcoming movies returned empty array')
          }
        } else if (upcomingResult?.status === 'rejected') {
          fail('TMDB upcoming movies request failed:', upcomingResult.reason)
        }
      }
    }

    // Enrich remaining movies with TMDB search (for movies that don't have TMDB data yet)
    const moviesToEnrich = Array.from(movieMap.values()).filter((m) => !m.tmdbId)
    if (moviesToEnrich.length > 0) {
      // Use batch enrichment with pre-fetched TMDB data to avoid unnecessary searches
      const enriched = await batchEnrichMoviesWithTMDB(moviesToEnrich, tmdbTitleMap)

      for (let i = 0; i < enriched.length; i++) {
        const key = moviesToEnrich[i].name.toLowerCase().trim()
        movieMap.set(key, enriched[i])
      }
    }
  }

  // Return all merged movies (no filtering by wish data)
  const finalMovies = Array.from(movieMap.values())
  info(`Final merged list (no cache): ${finalMovies.length} unique movies`)
  return finalMovies
}

/**
 * Get and merge movie lists, enrich with TMDB information
 * @param options Options for fetching TMDB movies
 *   - includeTMDBPopular: Include popular movies from TMDB (default: true)
 *   - includeTMDBUpcoming: Include upcoming movies from TMDB, merged with now playing movies (default: true)
 *     Now playing movies with rating >= 7.0 will be included in upcoming list
 */
export async function getMergedMoviesList(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  info('Fetching and merging movie lists from Maoyan and TMDB')

  const { includeTMDBPopular = true, includeTMDBUpcoming = true } = options

  // Fetch Maoyan lists (use allSettled for graceful error handling)
  const maoyanResults = await Promise.allSettled([fetchTopRatedMovies(), fetchMostExpected(20, 0)])

  const topRated = maoyanResults[0]?.status === 'fulfilled' ? maoyanResults[0].value : []
  const mostExpected = maoyanResults[1]?.status === 'fulfilled' ? maoyanResults[1].value : []

  if (maoyanResults[0]?.status === 'rejected') {
    fail('Failed to fetch top rated movies from Maoyan:', maoyanResults[0].reason)
  }
  if (maoyanResults[1]?.status === 'rejected') {
    fail('Failed to fetch most expected movies from Maoyan:', maoyanResults[1].reason)
  }

  // Merge Maoyan movies
  const movieMap = new Map<string, MergedMovie>()

  // Process top rated movies
  for (const movie of topRated) {
    const key = movie.name.toLowerCase().trim()
    movieMap.set(key, {
      maoyanId: movie.movieId,
      name: movie.name,
      poster: movie.poster,
      score: movie.score,
      source: 'topRated',
      sources: ['topRated'],
      maoyanUrl: getMaoyanUrl(movie.movieId),
    })
  }

  // Process most expected movies
  for (const movie of mostExpected) {
    const key = movie.nm.toLowerCase().trim()
    const existing = movieMap.get(key)

    if (existing) {
      if (!existing.sources.includes('mostExpected')) {
        existing.sources.push('mostExpected')
      }
      if (!existing.wish && movie.wish) {
        existing.wish = movie.wish
      }
      // Ensure maoyanUrl is set if not already present
      if (!existing.maoyanUrl) {
        existing.maoyanUrl = getMaoyanUrl(movie.id)
      }
    } else {
      movieMap.set(key, {
        maoyanId: movie.id,
        name: movie.nm,
        poster: movie.img,
        wish: movie.wish,
        source: 'mostExpected',
        sources: ['mostExpected'],
        maoyanUrl: getMaoyanUrl(movie.id),
      })
    }
  }

  info(`Merged ${movieMap.size} unique movies from Maoyan (${topRated.length} top rated + ${mostExpected.length} most expected)`)

  // Fetch TMDB movies if API key is available
  if (hasTmdbApiKey()) {
    const tmdbPromises: Promise<TMDBMovie[]>[] = []

    if (includeTMDBPopular) {
      tmdbPromises.push(fetchPopularMovies({ language: 'zh-CN', page: 1 }))
    }

    // Fetch upcoming movies
    if (includeTMDBUpcoming) {
      // TMDB's upcoming movies API returns movies scheduled to be released in the next month (30 days)
      tmdbPromises.push(fetchUpcomingMovies({ language: 'zh-CN', page: 1 }))
    }

    // Build a map of TMDB movies by title for efficient lookup
    const tmdbTitleMap = new Map<string, TMDBMovie>()

    if (tmdbPromises.length > 0) {
      info('Fetching TMDB movie lists')
      const tmdbResults = await Promise.allSettled(tmdbPromises)

      let tmdbIndex = 0
      if (includeTMDBPopular) {
        const result = tmdbResults[tmdbIndex]
        if (result?.status === 'fulfilled') {
          const movies = result.value
          if (movies && movies.length > 0) {
            await mergeTMDBMovies(movieMap, movies, 'tmdbPopular')
            // Add to title map for efficient lookup during enrichment
            for (const movie of movies) {
              const key = movie.title.toLowerCase().trim()
              if (!tmdbTitleMap.has(key)) {
                tmdbTitleMap.set(key, movie)
              }
            }
            info(`Merged ${movies.length} popular movies from TMDB`)
          } else {
            warn('TMDB popular movies returned empty array')
          }
        } else if (result?.status === 'rejected') {
          fail('TMDB popular movies request failed:', result.reason)
        }
        tmdbIndex++
      }

      if (includeTMDBUpcoming) {
        // Merge upcoming movies
        const upcomingResult = tmdbResults[tmdbIndex]
        if (upcomingResult?.status === 'fulfilled') {
          const movies = upcomingResult.value
          if (movies && movies.length > 0) {
            await mergeTMDBMovies(movieMap, movies, 'tmdbUpcoming')
            // Add to title map for efficient lookup during enrichment
            for (const movie of movies) {
              const key = movie.title.toLowerCase().trim()
              if (!tmdbTitleMap.has(key)) {
                tmdbTitleMap.set(key, movie)
              }
            }
            info(`Merged ${movies.length} upcoming movies from TMDB`)
          } else {
            warn('TMDB upcoming movies returned empty array')
          }
        } else if (upcomingResult?.status === 'rejected') {
          fail('TMDB upcoming movies request failed:', upcomingResult.reason)
        }
      }
    }

    // Enrich remaining movies with TMDB search (for movies that don't have TMDB data yet)
    const moviesToEnrich = Array.from(movieMap.values()).filter((m) => !m.tmdbId)
    if (moviesToEnrich.length > 0) {
      // Use batch enrichment with pre-fetched TMDB data to avoid unnecessary searches
      const enriched = await batchEnrichMoviesWithTMDB(moviesToEnrich, tmdbTitleMap)

      for (let i = 0; i < enriched.length; i++) {
        const key = moviesToEnrich[i].name.toLowerCase().trim()
        movieMap.set(key, enriched[i])
      }
    }
  }

  // Return all merged movies (no filtering by wish data)
  const finalMovies = Array.from(movieMap.values())
  info(`Final merged list: ${finalMovies.length} unique movies`)
  return finalMovies
}
