'use client'

import type { MergedMovie } from '@/services/maoyan/types'

import MovieSwipeView from './MovieSwipeView'

interface MovieListMobileProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieListMobile({ movies, favoriteAvailable, favoriteIds, shareToken }: MovieListMobileProps) {
  // Filter movies: only keep those with rating or wish data
  const filteredMovies = movies.filter((movie) => {
    const hasRating = movie.rating !== undefined && movie.rating > 0
    const hasWish = movie.wish !== undefined && movie.wish > 0
    return hasRating || hasWish
  })

  if (!filteredMovies || filteredMovies.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">No movies available</p>
          <p className="mt-2 text-sm text-gray-600">Please try again later</p>
        </div>
      </div>
    )
  }

  return <MovieSwipeView movies={filteredMovies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
}
