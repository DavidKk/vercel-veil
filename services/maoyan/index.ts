import { fail, info, warn } from '@/services/logger'
import type { TMDBMovie } from '@/services/tmdb'
import { fetchNowPlayingMovies, fetchPopularMovies, fetchUpcomingMovies, getGenreNames, getMovieDetails, searchMulti } from '@/services/tmdb'
import { hasTmdbApiKey } from '@/services/tmdb/env'

import type { ComingMovie, MergedMovie, MostExpectedResponse, MovieListItem, TopRatedMoviesResponse } from './types'

const MAOYAN_API_BASE = 'https://apis.netstart.cn/maoyan'

/**
 * Fetch top rated movies list
 */
export async function fetchTopRatedMovies(): Promise<MovieListItem[]> {
  try {
    info('Fetching top rated movies from Maoyan')
    const response = await fetch(`${MAOYAN_API_BASE}/index/topRatedMovies`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      fail(`Failed to fetch top rated movies: ${response.status} ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as TopRatedMoviesResponse
    info(`Fetched ${data.movieList?.length || 0} top rated movies`)
    return data.movieList || []
  } catch (error) {
    fail('Error fetching top rated movies:', error)
    return []
  }
}

/**
 * Fetch most expected movies list
 */
export async function fetchMostExpected(limit = 20, offset = 0): Promise<ComingMovie[]> {
  try {
    info(`Fetching most expected movies from Maoyan (limit=${limit}, offset=${offset})`)
    const response = await fetch(`${MAOYAN_API_BASE}/index/mostExpected?ci=1&limit=${limit}&offset=${offset}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      fail(`Failed to fetch most expected movies: ${response.status} ${response.statusText}`)
      return []
    }

    const data = (await response.json()) as MostExpectedResponse
    info(`Fetched ${data.coming?.length || 0} most expected movies`)
    return data.coming || []
  } catch (error) {
    fail('Error fetching most expected movies:', error)
    return []
  }
}

/**
 * Enrich movie information by searching TMDB
 */
async function enrichMovieWithTMDB(movie: MergedMovie): Promise<MergedMovie> {
  if (!hasTmdbApiKey()) {
    warn('TMDB API key not configured, skipping enrichment')
    return movie
  }

  try {
    info(`Searching TMDB for: ${movie.name}`)
    const results = await searchMulti(movie.name, { language: 'zh-CN' })

    if (!results || results.length === 0) {
      warn(`No TMDB results found for: ${movie.name}`)
      return movie
    }

    // Prefer movie type results
    const movieResult = results.find((r) => r.media_type === 'movie') ?? results[0]

    if (movieResult.id && movieResult.media_type === 'movie') {
      movie.tmdbId = movieResult.id
      movie.tmdbUrl = `https://www.themoviedb.org/movie/${movieResult.id}`

      if (movieResult.poster_path) {
        movie.tmdbPoster = `https://image.tmdb.org/t/p/w500${movieResult.poster_path}`
      }

      // Try to get overview, with fallback to English if Chinese is empty
      if (movieResult.overview && movieResult.overview.trim() !== '') {
        movie.overview = movieResult.overview
      } else {
        // If Chinese overview is empty, try to get English overview
        try {
          const movieDetails = await getMovieDetails(movieResult.id, 'zh-CN')
          if (movieDetails?.overview && movieDetails.overview.trim() !== '') {
            movie.overview = movieDetails.overview
          }
        } catch (error) {
          warn(`Failed to get movie details for "${movie.name}":`, error)
        }
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

      // Get genre names from genre IDs
      if (movieResult.genre_ids && movieResult.genre_ids.length > 0) {
        try {
          movie.genres = await getGenreNames(movieResult.genre_ids)
        } catch (error) {
          warn(`Failed to get genre names for movie "${movie.name}":`, error)
        }
      }

      info(`Enriched movie "${movie.name}" with TMDB ID: ${movie.tmdbId}`)
    }
  } catch (error) {
    fail(`Error enriching movie "${movie.name}" with TMDB:`, error)
  }

  return movie
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

    if (tmdbPromises.length > 0) {
      info('Fetching TMDB movie lists')
      const tmdbResults = await Promise.allSettled(tmdbPromises)

      let tmdbIndex = 0
      if (includeTMDBPopular && tmdbResults[tmdbIndex]?.status === 'fulfilled') {
        const result = tmdbResults[tmdbIndex]
        if (result.status === 'fulfilled') {
          const movies = result.value
          await mergeTMDBMovies(movieMap, movies, 'tmdbPopular')
          info(`Merged ${movies.length} popular movies from TMDB`)
        }
        tmdbIndex++
      }

      if (includeTMDBUpcoming && tmdbResults[tmdbIndex]?.status === 'fulfilled') {
        const result = tmdbResults[tmdbIndex]
        if (result.status === 'fulfilled') {
          const movies = result.value
          await mergeTMDBMovies(movieMap, movies, 'tmdbUpcoming')
          info(`Merged ${movies.length} upcoming movies from TMDB`)
        }
        tmdbIndex++
      }

      if (includeTMDBNowPlaying && tmdbResults[tmdbIndex]?.status === 'fulfilled') {
        const result = tmdbResults[tmdbIndex]
        if (result.status === 'fulfilled') {
          const movies = result.value
          await mergeTMDBMovies(movieMap, movies, 'tmdbNowPlaying')
          info(`Merged ${movies.length} now playing movies from TMDB`)
        }
      }
    }

    // Enrich remaining movies with TMDB search (for movies that don't have TMDB data yet)
    info('Enriching movies with TMDB search data')
    const moviesToEnrich = Array.from(movieMap.values()).filter((m) => !m.tmdbId)
    if (moviesToEnrich.length > 0) {
      const enriched = await Promise.allSettled(moviesToEnrich.map((movie) => enrichMovieWithTMDB(movie)))

      for (let i = 0; i < enriched.length; i++) {
        const result = enriched[i]
        if (result.status === 'fulfilled') {
          const key = moviesToEnrich[i].name.toLowerCase().trim()
          movieMap.set(key, result.value)
        }
      }
    }
  }

  const finalMovies = Array.from(movieMap.values())
  info(`Final merged list: ${finalMovies.length} unique movies`)
  return finalMovies
}
