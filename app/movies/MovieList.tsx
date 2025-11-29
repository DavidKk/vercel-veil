'use client'

import { useMemo, useState } from 'react'

import ClearableSelect from '@/components/ClearableSelect'
import type { MergedMovie } from '@/services/maoyan/types'

import MovieCard from './MovieCard'

type SortOption = 'rating' | 'wish' | ''

interface MovieListProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
}

export default function MovieList({ movies, favoriteAvailable, favoriteIds }: MovieListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('')

  // Filter movies: only keep those with rating or wish data
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const hasRating = movie.rating !== undefined && movie.rating > 0
      const hasWish = movie.wish !== undefined && movie.wish > 0
      return hasRating || hasWish
    })
  }, [movies])

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
          <p className="text-lg font-semibold text-gray-900">No movies available</p>
          <p className="mt-2 text-sm text-gray-600">Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sort Controls - Sticky */}
      <div className="sticky top-2 z-10">
        <div className="rounded-xl border border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-md ring-1 ring-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{sortedMovies.length}</span> movies
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* Movie Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedMovies.map((movie) => (
          <MovieCard
            key={`${movie.source}-${movie.maoyanId}`}
            movie={movie}
            favoriteAvailable={favoriteAvailable}
            isFavorited={movie.tmdbId ? favoriteIds.has(movie.tmdbId) : false}
          />
        ))}
      </div>
    </div>
  )
}
