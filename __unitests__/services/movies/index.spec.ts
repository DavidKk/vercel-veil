import type { MergedMovie } from '@/services/maoyan/types'
import { filterMoviesByCurrentYear, getMovieId, getMovieYear, getUnnotifiedMovies, isMovieFromYearOrLater, markMoviesAsNotified } from '@/services/movies'
import type { MoviesCacheData } from '@/services/movies/types'

describe('services/movies/index', () => {
  describe('getMovieId', () => {
    it('should use maoyanId when available', () => {
      const movie: MergedMovie = {
        maoyanId: 12345,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
      }

      const result = getMovieId(movie)

      expect(result).toBe('maoyan:12345')
    })

    it('should use tmdbId when maoyanId is not available', () => {
      const movie: MergedMovie = {
        maoyanId: undefined,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'tmdbPopular',
        sources: ['tmdbPopular'],
        tmdbId: 67890,
      }

      const result = getMovieId(movie)

      expect(result).toBe('tmdb:67890')
    })

    it('should use name when neither maoyanId nor tmdbId is available', () => {
      const movie: MergedMovie = {
        maoyanId: undefined,
        name: '  Test Movie  ',
        poster: 'https://example.com/poster.jpg',
        source: 'tmdbPopular',
        sources: ['tmdbPopular'],
      }

      const result = getMovieId(movie)

      expect(result).toBe('name:test movie')
    })

    it('should handle string maoyanId', () => {
      const movie: MergedMovie = {
        maoyanId: '12345',
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
      }

      const result = getMovieId(movie)

      expect(result).toBe('maoyan:12345')
    })

    it('should handle null maoyanId and use tmdbId', () => {
      const movie: MergedMovie = {
        maoyanId: null as any,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'tmdbPopular',
        sources: ['tmdbPopular'],
        tmdbId: 67890,
      }

      const result = getMovieId(movie)

      expect(result).toBe('tmdb:67890')
    })
  })

  describe('getMovieYear', () => {
    it('should return year from year field when available', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: 2024,
      }

      const result = getMovieYear(movie)

      expect(result).toBe(2024)
    })

    it('should parse year from releaseDate when year field is not available', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        releaseDate: '2024-10-15',
      }

      const result = getMovieYear(movie)

      expect(result).toBe(2024)
    })

    it('should prefer year field over releaseDate', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: 2025,
        releaseDate: '2024-10-15',
      }

      const result = getMovieYear(movie)

      expect(result).toBe(2025)
    })

    it('should return null when neither year nor releaseDate is available', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
      }

      const result = getMovieYear(movie)

      expect(result).toBeNull()
    })

    it('should handle invalid year field and fallback to releaseDate', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: 'invalid' as any,
        releaseDate: '2024-10-15',
      }

      const result = getMovieYear(movie)

      expect(result).toBe(2024)
    })

    it('should return null for invalid releaseDate', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        releaseDate: 'invalid-date',
      }

      const result = getMovieYear(movie)

      expect(result).toBeNull()
    })

    it('should handle string year field', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: '2024' as any,
      }

      const result = getMovieYear(movie)

      expect(result).toBe(2024)
    })
  })

  describe('isMovieFromYearOrLater', () => {
    beforeEach(() => {
      jest.useRealTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return true for movie from current year', () => {
      jest.useFakeTimers()
      const currentYear = 2024
      jest.setSystemTime(new Date(`${currentYear}-06-15`).getTime())

      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: currentYear,
      }

      const result = isMovieFromYearOrLater(movie)

      expect(result.isValid).toBe(true)
      expect(result.year).toBe(currentYear)
      jest.useRealTimers()
    })

    it('should return true for movie from future year', () => {
      jest.useFakeTimers()
      const currentYear = 2024
      jest.setSystemTime(new Date(`${currentYear}-06-15`).getTime())

      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: 2025,
      }

      const result = isMovieFromYearOrLater(movie)

      expect(result.isValid).toBe(true)
      expect(result.year).toBe(2025)
      jest.useRealTimers()
    })

    it('should return false for movie from past year', () => {
      jest.useFakeTimers()
      const currentYear = 2024
      jest.setSystemTime(new Date(`${currentYear}-06-15`).getTime())

      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: 2023,
      }

      const result = isMovieFromYearOrLater(movie)

      expect(result.isValid).toBe(false)
      expect(result.year).toBe(2023)
      jest.useRealTimers()
    })

    it('should return false when movie has no year information', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
      }

      const result = isMovieFromYearOrLater(movie)

      expect(result.isValid).toBe(false)
      expect(result.year).toBeNull()
    })

    it('should use custom targetYear when provided', () => {
      const movie: MergedMovie = {
        maoyanId: 1,
        name: 'Test Movie',
        poster: 'https://example.com/poster.jpg',
        source: 'topRated',
        sources: ['topRated'],
        year: 2023,
      }

      const result = isMovieFromYearOrLater(movie, 2022)

      expect(result.isValid).toBe(true)
      expect(result.year).toBe(2023)
    })
  })

  describe('filterMoviesByCurrentYear', () => {
    beforeEach(() => {
      jest.useRealTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should filter out movies from past years', () => {
      jest.useFakeTimers()
      const currentYear = 2024
      jest.setSystemTime(new Date(`${currentYear}-06-15`).getTime())

      const movies: MergedMovie[] = [
        {
          maoyanId: 1,
          name: 'Movie 2024',
          poster: 'https://example.com/poster1.jpg',
          source: 'topRated',
          sources: ['topRated'],
          year: 2024,
        },
        {
          maoyanId: 2,
          name: 'Movie 2023',
          poster: 'https://example.com/poster2.jpg',
          source: 'topRated',
          sources: ['topRated'],
          year: 2023,
        },
        {
          maoyanId: 3,
          name: 'Movie 2025',
          poster: 'https://example.com/poster3.jpg',
          source: 'topRated',
          sources: ['topRated'],
          year: 2025,
        },
      ]

      const result = filterMoviesByCurrentYear(movies)

      expect(result).toHaveLength(2)
      expect(result.map((m) => m.name)).toEqual(['Movie 2024', 'Movie 2025'])
      jest.useRealTimers()
    })

    it('should filter out movies without year information', () => {
      const movies: MergedMovie[] = [
        {
          maoyanId: 1,
          name: 'Movie 2024',
          poster: 'https://example.com/poster1.jpg',
          source: 'topRated',
          sources: ['topRated'],
          year: 2024,
        },
        {
          maoyanId: 2,
          name: 'Movie No Year',
          poster: 'https://example.com/poster2.jpg',
          source: 'topRated',
          sources: ['topRated'],
        },
      ]

      const result = filterMoviesByCurrentYear(movies, 2024)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Movie 2024')
    })

    it('should use custom targetYear when provided', () => {
      const movies: MergedMovie[] = [
        {
          maoyanId: 1,
          name: 'Movie 2023',
          poster: 'https://example.com/poster1.jpg',
          source: 'topRated',
          sources: ['topRated'],
          year: 2023,
        },
        {
          maoyanId: 2,
          name: 'Movie 2022',
          poster: 'https://example.com/poster2.jpg',
          source: 'topRated',
          sources: ['topRated'],
          year: 2022,
        },
      ]

      const result = filterMoviesByCurrentYear(movies, 2022)

      expect(result).toHaveLength(2)
    })
  })

  describe('getUnnotifiedMovies', () => {
    it('should return all movies when notifiedMovieIds is empty', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
            {
              maoyanId: 2,
              name: 'Movie 2',
              poster: 'https://example.com/poster2.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 2,
            description: 'Test data',
          },
        },
        notifiedMovieIds: [],
      }

      const result = getUnnotifiedMovies(cacheData)

      expect(result).toHaveLength(2)
    })

    it('should filter out notified movies by maoyanId', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
            {
              maoyanId: 2,
              name: 'Movie 2',
              poster: 'https://example.com/poster2.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 2,
            description: 'Test data',
          },
        },
        notifiedMovieIds: ['maoyan:1'],
      }

      const result = getUnnotifiedMovies(cacheData)

      expect(result).toHaveLength(1)
      expect(result[0].maoyanId).toBe(2)
    })

    it('should filter out notified movies by tmdbId', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: undefined,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'tmdbPopular',
              sources: ['tmdbPopular'],
              tmdbId: 100,
            },
            {
              maoyanId: undefined,
              name: 'Movie 2',
              poster: 'https://example.com/poster2.jpg',
              source: 'tmdbPopular',
              sources: ['tmdbPopular'],
              tmdbId: 200,
            },
          ],
          metadata: {
            totalCount: 2,
            description: 'Test data',
          },
        },
        notifiedMovieIds: ['tmdb:100'],
      }

      const result = getUnnotifiedMovies(cacheData)

      expect(result).toHaveLength(1)
      expect(result[0].tmdbId).toBe(200)
    })

    it('should filter out notified movies by name', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: undefined,
              name: 'Movie One',
              poster: 'https://example.com/poster1.jpg',
              source: 'tmdbPopular',
              sources: ['tmdbPopular'],
            },
            {
              maoyanId: undefined,
              name: 'Movie Two',
              poster: 'https://example.com/poster2.jpg',
              source: 'tmdbPopular',
              sources: ['tmdbPopular'],
            },
          ],
          metadata: {
            totalCount: 2,
            description: 'Test data',
          },
        },
        notifiedMovieIds: ['name:movie one'],
      }

      const result = getUnnotifiedMovies(cacheData)

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Movie Two')
    })

    it('should return empty array when cacheData is null', () => {
      const result = getUnnotifiedMovies(null)

      expect(result).toEqual([])
    })

    it('should return empty array when movies array is empty', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [],
          metadata: {
            totalCount: 0,
            description: 'Test data',
          },
        },
        notifiedMovieIds: [],
      }

      const result = getUnnotifiedMovies(cacheData)

      expect(result).toEqual([])
    })

    it('should handle missing notifiedMovieIds field', () => {
      const cacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 1,
            description: 'Test data',
          },
        },
      } as MoviesCacheData

      const result = getUnnotifiedMovies(cacheData)

      expect(result).toHaveLength(1)
    })
  })

  describe('markMoviesAsNotified', () => {
    it('should add movie IDs to notifiedMovieIds', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
            {
              maoyanId: 2,
              name: 'Movie 2',
              poster: 'https://example.com/poster2.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 2,
            description: 'Test data',
          },
        },
        notifiedMovieIds: [],
      }

      const moviesToMark: MergedMovie[] = [cacheData.data.movies[0]]

      const result = markMoviesAsNotified(cacheData, moviesToMark)

      expect(result.notifiedMovieIds).toHaveLength(1)
      expect(result.notifiedMovieIds).toContain('maoyan:1')
    })

    it('should append to existing notifiedMovieIds', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
            {
              maoyanId: 2,
              name: 'Movie 2',
              poster: 'https://example.com/poster2.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 2,
            description: 'Test data',
          },
        },
        notifiedMovieIds: ['maoyan:1'],
      }

      const moviesToMark: MergedMovie[] = [cacheData.data.movies[1]]

      const result = markMoviesAsNotified(cacheData, moviesToMark)

      expect(result.notifiedMovieIds).toHaveLength(2)
      expect(result.notifiedMovieIds).toContain('maoyan:1')
      expect(result.notifiedMovieIds).toContain('maoyan:2')
    })

    it('should clean up IDs that are no longer in movies list', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 1,
            description: 'Test data',
          },
        },
        notifiedMovieIds: ['maoyan:1', 'maoyan:999'], // 999 is not in movies list
      }

      const moviesToMark: MergedMovie[] = []

      const result = markMoviesAsNotified(cacheData, moviesToMark)

      expect(result.notifiedMovieIds).toHaveLength(1)
      expect(result.notifiedMovieIds).toContain('maoyan:1')
      expect(result.notifiedMovieIds).not.toContain('maoyan:999')
    })

    it('should handle multiple movies with different ID types', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
            {
              maoyanId: undefined,
              name: 'Movie 2',
              poster: 'https://example.com/poster2.jpg',
              source: 'tmdbPopular',
              sources: ['tmdbPopular'],
              tmdbId: 200,
            },
            {
              maoyanId: undefined,
              name: 'Movie Three',
              poster: 'https://example.com/poster3.jpg',
              source: 'tmdbPopular',
              sources: ['tmdbPopular'],
            },
          ],
          metadata: {
            totalCount: 3,
            description: 'Test data',
          },
        },
        notifiedMovieIds: [],
      }

      const moviesToMark: MergedMovie[] = cacheData.data.movies

      const result = markMoviesAsNotified(cacheData, moviesToMark)

      expect(result.notifiedMovieIds).toHaveLength(3)
      expect(result.notifiedMovieIds).toContain('maoyan:1')
      expect(result.notifiedMovieIds).toContain('tmdb:200')
      expect(result.notifiedMovieIds).toContain('name:movie three')
    })

    it('should handle missing notifiedMovieIds field', () => {
      const cacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 1,
            description: 'Test data',
          },
        },
      } as MoviesCacheData

      const moviesToMark: MergedMovie[] = cacheData.data.movies

      const result = markMoviesAsNotified(cacheData, moviesToMark)

      expect(result.notifiedMovieIds).toHaveLength(1)
      expect(result.notifiedMovieIds).toContain('maoyan:1')
    })

    it('should not duplicate movie IDs', () => {
      const cacheData: MoviesCacheData = {
        data: {
          date: '2024-01-15',
          timestamp: Date.now(),
          movies: [
            {
              maoyanId: 1,
              name: 'Movie 1',
              poster: 'https://example.com/poster1.jpg',
              source: 'topRated',
              sources: ['topRated'],
            },
          ],
          metadata: {
            totalCount: 1,
            description: 'Test data',
          },
        },
        notifiedMovieIds: ['maoyan:1'],
      }

      const moviesToMark: MergedMovie[] = [cacheData.data.movies[0]]

      const result = markMoviesAsNotified(cacheData, moviesToMark)

      expect(result.notifiedMovieIds).toHaveLength(1)
      expect(result.notifiedMovieIds).toContain('maoyan:1')
    })
  })
})
