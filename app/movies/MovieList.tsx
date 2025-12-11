'use client'

import { useMemo, useState } from 'react'

import ClearableSelect from '@/components/ClearableSelect'
import type { MergedMovie } from '@/services/maoyan/types'

import MovieCard from './MovieCard'
import { filterMoviesWithRatingOrWish, getReleaseInfo } from './utils/movieHelpers'

type SortOption = 'rating' | 'wish' | ''
type ReleaseFilter = 'all' | 'released' | 'upcoming'

interface MovieListProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieList({ movies, favoriteAvailable, favoriteIds, shareToken }: MovieListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('')
  const [releaseFilter, setReleaseFilter] = useState<ReleaseFilter>('all')

  // Filter movies: only keep those with rating or wish data
  const filteredMovies = useMemo(() => filterMoviesWithRatingOrWish(movies), [movies])

  // Filter by release status
  const releaseFilteredMovies = useMemo(() => {
    if (releaseFilter === 'all') {
      return filteredMovies
    }

    return filteredMovies.filter((movie) => {
      const releaseInfo = getReleaseInfo(movie)
      if (!releaseInfo) {
        // If no release date, include in "upcoming" filter, exclude from "released"
        return releaseFilter === 'upcoming'
      }

      if (releaseFilter === 'released') {
        return releaseInfo.isReleased
      } else if (releaseFilter === 'upcoming') {
        return !releaseInfo.isReleased
      }

      return true
    })
  }, [filteredMovies, releaseFilter])

  // Sort movies based on selected option
  const sortedMovies = useMemo(() => {
    if (!sortBy) {
      return releaseFilteredMovies
    }

    return [...releaseFilteredMovies].sort((a, b) => {
      if (sortBy === 'rating') {
        // Use rating (TMDB) or score (Maoyan) as fallback
        let ratingA = a.rating
        if (ratingA === undefined || ratingA === null) {
          if (a.score) {
            const parsed = parseFloat(a.score)
            ratingA = isNaN(parsed) ? 0 : parsed
          } else {
            ratingA = 0
          }
        }

        let ratingB = b.rating
        if (ratingB === undefined || ratingB === null) {
          if (b.score) {
            const parsed = parseFloat(b.score)
            ratingB = isNaN(parsed) ? 0 : parsed
          } else {
            ratingB = 0
          }
        }

        // Descending order, if equal, sort by name for stability
        if (ratingB !== ratingA) {
          return ratingB - ratingA
        }
        return a.name.localeCompare(b.name)
      } else if (sortBy === 'wish') {
        // Use wish (Maoyan) or tmdbVoteCount (TMDB) as fallback, prefer the higher value
        const wishA = Math.max(a.wish ?? 0, a.tmdbVoteCount ?? 0)
        const wishB = Math.max(b.wish ?? 0, b.tmdbVoteCount ?? 0)

        // Descending order, if equal, sort by name for stability
        if (wishB !== wishA) {
          return wishB - wishA
        }
        return a.name.localeCompare(b.name)
      }
      return 0
    })
  }, [releaseFilteredMovies, sortBy])

  if (!sortedMovies || sortedMovies.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">No movies available</p>
          <p className="mt-2 text-sm text-gray-300">Please try again later</p>
        </div>
      </div>
    )
  }

  // Desktop grid view only (mobile is handled in MovieListMobile)
  return (
    <div className="space-y-4">
      {/* Sort Controls - Sticky */}
      <div className="hidden lg:block sticky top-20 z-10">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md px-4 lg:px-6 xl:px-8 py-3 shadow-xl ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-white">{sortedMovies.length}</span> movies
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="release-filter-select" className="text-sm font-medium text-white">
                Filter:
              </label>
              <ClearableSelect
                value={releaseFilter}
                placeholder="All"
                onChange={(value) => setReleaseFilter((value || 'all') as ReleaseFilter)}
                options={[
                  { value: 'all', label: 'All Movies' },
                  { value: 'released', label: 'Released' },
                  { value: 'upcoming', label: 'Upcoming' },
                ]}
                clearable={false}
                media={true}
              />
              <label htmlFor="sort-select" className="text-sm font-medium text-white">
                Sort by:
              </label>
              <ClearableSelect
                value={sortBy}
                placeholder="Default"
                onChange={(value) => setSortBy((value || '') as SortOption)}
                options={[
                  { value: 'rating', label: 'Rating (High to Low)' },
                  { value: 'wish', label: 'Wish Count (High to Low)' },
                ]}
                clearable={true}
                media={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Movie Masonry Layout - Desktop only */}
      <div className="columns-1 gap-4 lg:columns-3 2xl:columns-4">
        {sortedMovies.map((movie) => (
          <div key={`${movie.source}-${movie.maoyanId}`} className="break-inside-avoid mb-6">
            <MovieCard movie={movie} favoriteAvailable={favoriteAvailable} isFavorited={movie.tmdbId ? favoriteIds.has(movie.tmdbId) : false} shareToken={shareToken} />
          </div>
        ))}
      </div>
    </div>
  )
}
