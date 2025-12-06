'use client'

import { useMemo, useState } from 'react'

import ClearableSelect from '@/components/ClearableSelect'
import type { MergedMovie } from '@/services/maoyan/types'

import MovieCard from './MovieCard'
import { filterMoviesWithRatingOrWish } from './utils/movieHelpers'

type SortOption = 'rating' | 'wish' | ''

interface MovieListProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieList({ movies, favoriteAvailable, favoriteIds, shareToken }: MovieListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('')

  // Filter movies: only keep those with rating or wish data
  const filteredMovies = useMemo(() => filterMoviesWithRatingOrWish(movies), [movies])

  // Sort movies based on selected option
  const sortedMovies = useMemo(() => {
    if (!sortBy) {
      return filteredMovies
    }

    return [...filteredMovies].sort((a, b) => {
      if (sortBy === 'rating') {
        // Use rating (TMDB) or score (Maoyan) as fallback
        const ratingA = a.rating ?? (a.score ? parseFloat(a.score) : 0)
        const ratingB = b.rating ?? (b.score ? parseFloat(b.score) : 0)
        return ratingB - ratingA // Descending order
      } else if (sortBy === 'wish') {
        const wishA = a.wish ?? 0
        const wishB = b.wish ?? 0
        return wishB - wishA // Descending order
      }
      return 0
    })
  }, [filteredMovies, sortBy])

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
