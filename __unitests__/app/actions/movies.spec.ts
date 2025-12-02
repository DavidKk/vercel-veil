import type { GetMergedMoviesListOptions } from '@/services/maoyan'
import type { MergedMovie } from '@/services/maoyan/types'

// Mock all dependencies
jest.mock('@/services/auth/access', () => ({
  validateCookie: jest.fn(),
}))

jest.mock('@/services/maoyan', () => ({
  getMergedMoviesList: jest.fn(),
}))

jest.mock('@/services/movies', () => ({
  getMoviesFromGist: jest.fn(),
  getResultFromCache: jest.fn(),
  setResultToCache: jest.fn(),
  getMoviesListWithAutoUpdate: jest.fn(),
}))

jest.mock('@/services/tmdb', () => ({
  addToFavorites: jest.fn(),
  getFavoriteMovies: jest.fn(),
}))

jest.mock('@/services/tmdb/env', () => ({
  hasTmdbAuth: jest.fn(),
}))

jest.mock('@/services/logger', () => ({
  info: jest.fn(),
  fail: jest.fn(),
  warn: jest.fn(),
}))

import { favoriteMovie, getFavoriteMovieIds, getMoviesList, getMoviesListWithGistCache, isFavoriteFeatureAvailable } from '@/app/actions/movies/index'
import { validateCookie } from '@/services/auth/access'
import { getMergedMoviesList } from '@/services/maoyan'
import { getMoviesListWithAutoUpdate } from '@/services/movies'
import { addToFavorites, getFavoriteMovies } from '@/services/tmdb'
import { hasTmdbAuth } from '@/services/tmdb/env'

describe('app/actions/movies', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getMoviesList', () => {
    const mockMovies: MergedMovie[] = [
      {
        maoyanId: 1,
        name: 'Test Movie 1',
        poster: 'https://example.com/poster1.jpg',
        source: 'topRated',
        sources: ['topRated'],
      },
      {
        maoyanId: 2,
        name: 'Test Movie 2',
        poster: 'https://example.com/poster2.jpg',
        source: 'mostExpected',
        sources: ['mostExpected'],
      },
    ]

    it('should return movies list when authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(getMergedMoviesList as jest.Mock).mockResolvedValue(mockMovies)

      const result = await getMoviesList()

      expect(validateCookie).toHaveBeenCalled()
      expect(getMergedMoviesList).toHaveBeenCalledWith({})
      expect(result).toEqual(mockMovies)
    })

    it('should throw error when not authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(false)

      await expect(getMoviesList()).rejects.toThrow('Unauthorized')
      expect(getMergedMoviesList).not.toHaveBeenCalled()
    })

    it('should pass options to getMergedMoviesList', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(getMergedMoviesList as jest.Mock).mockResolvedValue(mockMovies)

      const options: GetMergedMoviesListOptions = {
        includeTMDBPopular: false,
        includeTMDBUpcoming: true,
      }

      await getMoviesList(options)

      expect(getMergedMoviesList).toHaveBeenCalledWith(options)
    })
  })

  describe('getMoviesListWithGistCache', () => {
    const mockMovies: MergedMovie[] = [
      {
        maoyanId: 1,
        name: 'Test Movie 1',
        poster: 'https://example.com/poster1.jpg',
        source: 'topRated',
        sources: ['topRated'],
        insertedAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
      },
    ]

    it('should return cached result when result cache is available', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(getMoviesListWithAutoUpdate as jest.Mock).mockResolvedValue(mockMovies)

      const result = await getMoviesListWithGistCache()

      expect(validateCookie).toHaveBeenCalled()
      expect(getMoviesListWithAutoUpdate).toHaveBeenCalledWith({})
      expect(result).toEqual(mockMovies)
    })

    it('should return GIST cache when available', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(getMoviesListWithAutoUpdate as jest.Mock).mockResolvedValue(mockMovies)

      const result = await getMoviesListWithGistCache()

      expect(getMoviesListWithAutoUpdate).toHaveBeenCalledWith({})
      expect(result).toEqual(mockMovies)
    })

    it('should fallback to getMoviesList when GIST cache does not exist', async () => {
      const newMovies: MergedMovie[] = [
        {
          maoyanId: 1,
          name: 'New Movie',
          poster: 'https://example.com/poster1.jpg',
          source: 'topRated',
          sources: ['topRated'],
        },
      ]

      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(getMoviesListWithAutoUpdate as jest.Mock).mockResolvedValue(newMovies)

      const result = await getMoviesListWithGistCache()

      expect(getMoviesListWithAutoUpdate).toHaveBeenCalledWith({})
      expect(result).toEqual(newMovies)
    })

    it('should fallback to getMoviesList when GIST read fails', async () => {
      const mockMovies: MergedMovie[] = [
        {
          maoyanId: 1,
          name: 'Test Movie',
          poster: 'https://example.com/poster.jpg',
          source: 'topRated',
          sources: ['topRated'],
        },
      ]

      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(getMoviesListWithAutoUpdate as jest.Mock).mockResolvedValue(mockMovies)

      const result = await getMoviesListWithGistCache()

      expect(getMoviesListWithAutoUpdate).toHaveBeenCalledWith({})
      expect(result).toEqual(mockMovies)
    })

    it('should throw error when not authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(false)

      await expect(getMoviesListWithGistCache()).rejects.toThrow('Unauthorized')
    })
  })

  describe('favoriteMovie', () => {
    it('should add movie to favorites when authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(addToFavorites as jest.Mock).mockResolvedValue(undefined)

      const result = await favoriteMovie(123, true)

      expect(validateCookie).toHaveBeenCalled()
      expect(addToFavorites).toHaveBeenCalledWith(123, true)
      expect(result).toEqual({
        success: true,
        message: 'Added to favorites',
      })
    })

    it('should remove movie from favorites', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(addToFavorites as jest.Mock).mockResolvedValue(undefined)

      const result = await favoriteMovie(123, false)

      expect(addToFavorites).toHaveBeenCalledWith(123, false)
      expect(result).toEqual({
        success: true,
        message: 'Removed from favorites',
      })
    })

    it('should return error when not authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(false)

      const result = await favoriteMovie(123, true)

      expect(addToFavorites).not.toHaveBeenCalled()
      expect(result).toEqual({
        success: false,
        message: 'Unauthorized',
      })
    })

    it('should handle errors gracefully', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(addToFavorites as jest.Mock).mockRejectedValue(new Error('API error'))

      const result = await favoriteMovie(123, true)

      expect(result).toEqual({
        success: false,
        message: 'API error',
      })
    })
  })

  describe('isFavoriteFeatureAvailable', () => {
    it('should return true when authenticated and TMDB auth is available', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(hasTmdbAuth as jest.Mock).mockReturnValue(true)

      const result = await isFavoriteFeatureAvailable()

      expect(result).toBe(true)
    })

    it('should return false when not authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(false)

      const result = await isFavoriteFeatureAvailable()

      expect(result).toBe(false)
      expect(hasTmdbAuth).not.toHaveBeenCalled()
    })

    it('should return false when TMDB auth is not available', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(hasTmdbAuth as jest.Mock).mockReturnValue(false)

      const result = await isFavoriteFeatureAvailable()

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      ;(validateCookie as jest.Mock).mockRejectedValue(new Error('Auth error'))

      const result = await isFavoriteFeatureAvailable()

      expect(result).toBe(false)
    })
  })

  describe('getFavoriteMovieIds', () => {
    it('should return favorite movie IDs when authenticated', async () => {
      const mockFavoriteIds = new Set([1, 2, 3])

      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(hasTmdbAuth as jest.Mock).mockReturnValue(true)
      ;(getFavoriteMovies as jest.Mock).mockResolvedValue(mockFavoriteIds)

      const result = await getFavoriteMovieIds()

      expect(validateCookie).toHaveBeenCalled()
      expect(getFavoriteMovies).toHaveBeenCalled()
      expect(result).toEqual([1, 2, 3])
    })

    it('should return empty array when not authenticated', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(false)

      const result = await getFavoriteMovieIds()

      expect(getFavoriteMovies).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array when TMDB auth is not available', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(hasTmdbAuth as jest.Mock).mockReturnValue(false)

      const result = await getFavoriteMovieIds()

      expect(getFavoriteMovies).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array on error', async () => {
      ;(validateCookie as jest.Mock).mockResolvedValue(true)
      ;(hasTmdbAuth as jest.Mock).mockReturnValue(true)
      ;(getFavoriteMovies as jest.Mock).mockRejectedValue(new Error('API error'))

      const result = await getFavoriteMovieIds()

      expect(result).toEqual([])
    })
  })
})
