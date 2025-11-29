import { fetchJsonWithCache } from '@/services/fetch'
import { fail, info, warn } from '@/services/logger'
import type { TMDBMovie } from '@/services/tmdb'
import { fetchNowPlayingMovies, fetchPopularMovies, fetchUpcomingMovies, getGenreNames, getMovieDetails, getMovieGenres, searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'

import { MAOYAN, MAOYAN_CACHE } from './constants'
import type { ComingMovie, MergedMovie, MostExpectedResponse, MovieListItem, TopRatedMoviesResponse } from './types'

/**
 * Fetch top rated movies list
 * Results are cached according to MAOYAN_CACHE.TOP_RATED_MOVIES to reduce API requests
 */
export async function fetchTopRatedMovies(): Promise<MovieListItem[]> {
  try {
    info('Fetching top rated movies from Maoyan')
    const data = await fetchJsonWithCache<TopRatedMoviesResponse>(`${MAOYAN.API_BASE}/index/topRatedMovies`, {
      headers: {
        'User-Agent': MAOYAN.USER_AGENT,
      },
      cacheDuration: MAOYAN_CACHE.TOP_RATED_MOVIES,
    })

    info(`Fetched ${data.movieList?.length || 0} top rated movies`)
    return data.movieList || []
  } catch (error) {
    fail('Error fetching top rated movies:', error)
    return []
  }
}

/**
 * Fetch most expected movies list
 * Results are cached according to MAOYAN_CACHE.MOST_EXPECTED to reduce API requests
 */
export async function fetchMostExpected(limit = 20, offset = 0): Promise<ComingMovie[]> {
  try {
    info(`Fetching most expected movies from Maoyan (limit=${limit}, offset=${offset})`)
    const data = await fetchJsonWithCache<MostExpectedResponse>(`${MAOYAN.API_BASE}/index/mostExpected?ci=1&limit=${limit}&offset=${offset}`, {
      headers: {
        'User-Agent': MAOYAN.USER_AGENT,
      },
      cacheDuration: MAOYAN_CACHE.MOST_EXPECTED,
    })

    info(`Fetched ${data.coming?.length || 0} most expected movies`)
    return data.coming || []
  } catch (error) {
    fail('Error fetching most expected movies:', error)
    return []
  }
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
      const key = movie.name.toLowerCase().trim()
      const tmdbMovie = tmdbTitleMap.get(key)

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
    const genresMap = await getMovieGenres()
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
async function convertTMDBMovieToMergedMovie(tmdbMovie: TMDBMovie, source: 'tmdbPopular' | 'tmdbUpcoming' | 'tmdbNowPlaying'): Promise<MergedMovie> {
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
 * Merge TMDB movies into existing movie map
 */
async function mergeTMDBMovies(movieMap: Map<string, MergedMovie>, tmdbMovies: TMDBMovie[], source: 'tmdbPopular' | 'tmdbUpcoming' | 'tmdbNowPlaying'): Promise<void> {
  for (const tmdbMovie of tmdbMovies) {
    const key = tmdbMovie.title.toLowerCase().trim()
    const existing = movieMap.get(key)

    if (existing) {
      // If exists, merge sources
      if (!existing.sources.includes(source)) {
        existing.sources.push(source)
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
      const newMovie = await convertTMDBMovieToMergedMovie(tmdbMovie, source)
      movieMap.set(key, newMovie)
    }
  }
}

/**
 * Get and merge movie lists, enrich with TMDB information
 * @param options Options for fetching TMDB movies
 */
export interface GetMergedMoviesListOptions {
  includeTMDBPopular?: boolean
  includeTMDBUpcoming?: boolean
  includeTMDBNowPlaying?: boolean
}

export async function getMergedMoviesList(options: GetMergedMoviesListOptions = {}): Promise<MergedMovie[]> {
  info('Fetching and merging movie lists from Maoyan and TMDB')

  const { includeTMDBPopular = true, includeTMDBUpcoming = true, includeTMDBNowPlaying = false } = options

  // Fetch Maoyan lists
  const [topRated, mostExpected] = await Promise.all([fetchTopRatedMovies(), fetchMostExpected(20, 0)])

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
    } else {
      movieMap.set(key, {
        maoyanId: movie.id,
        name: movie.nm,
        poster: movie.img,
        wish: movie.wish,
        source: 'mostExpected',
        sources: ['mostExpected'],
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

    if (includeTMDBUpcoming) {
      // TMDB's /movie/upcoming API returns movies scheduled to be released in the next 4 weeks (28 days)
      // This matches the default behavior on https://www.themoviedb.org/movie/upcoming
      tmdbPromises.push(fetchUpcomingMovies({ language: 'zh-CN', page: 1 }))
    }

    if (includeTMDBNowPlaying) {
      tmdbPromises.push(fetchNowPlayingMovies({ language: 'zh-CN', page: 1 }))
    }

    // Build a map of TMDB movies by title for efficient lookup
    const tmdbTitleMap = new Map<string, TMDBMovie>()

    if (tmdbPromises.length > 0) {
      info('Fetching TMDB movie lists')
      const tmdbResults = await Promise.allSettled(tmdbPromises)

      let tmdbIndex = 0
      if (includeTMDBPopular && tmdbResults[tmdbIndex]?.status === 'fulfilled') {
        const result = tmdbResults[tmdbIndex]
        if (result.status === 'fulfilled') {
          const movies = result.value
          await mergeTMDBMovies(movieMap, movies, 'tmdbPopular')
          // Add to title map for efficient lookup during enrichment
          for (const movie of movies) {
            const key = movie.title.toLowerCase().trim()
            if (!tmdbTitleMap.has(key)) {
              tmdbTitleMap.set(key, movie)
            }
          }
          info(`Merged ${movies.length} popular movies from TMDB`)
        }
        tmdbIndex++
      }

      if (includeTMDBUpcoming && tmdbResults[tmdbIndex]?.status === 'fulfilled') {
        const result = tmdbResults[tmdbIndex]
        if (result.status === 'fulfilled') {
          const movies = result.value
          await mergeTMDBMovies(movieMap, movies, 'tmdbUpcoming')
          // Add to title map for efficient lookup during enrichment
          for (const movie of movies) {
            const key = movie.title.toLowerCase().trim()
            if (!tmdbTitleMap.has(key)) {
              tmdbTitleMap.set(key, movie)
            }
          }
          info(`Merged ${movies.length} upcoming movies from TMDB`)
        }
        tmdbIndex++
      }

      if (includeTMDBNowPlaying && tmdbResults[tmdbIndex]?.status === 'fulfilled') {
        const result = tmdbResults[tmdbIndex]
        if (result.status === 'fulfilled') {
          const movies = result.value
          await mergeTMDBMovies(movieMap, movies, 'tmdbNowPlaying')
          // Add to title map for efficient lookup during enrichment
          for (const movie of movies) {
            const key = movie.title.toLowerCase().trim()
            if (!tmdbTitleMap.has(key)) {
              tmdbTitleMap.set(key, movie)
            }
          }
          info(`Merged ${movies.length} now playing movies from TMDB`)
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

  const finalMovies = Array.from(movieMap.values())
  info(`Final merged list: ${finalMovies.length} unique movies`)
  return finalMovies
}
