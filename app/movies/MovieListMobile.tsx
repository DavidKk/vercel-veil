'use client'

import type { MergedMovie } from '@/services/maoyan/types'

import MovieSwipeView from './MovieSwipeView'
import { filterMoviesWithRatingOrWish } from './utils/movieHelpers'

interface MovieListMobileProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieListMobile({ movies, favoriteAvailable, favoriteIds, shareToken }: MovieListMobileProps) {
  // Filter movies: only keep those with rating or wish data
  const filteredMovies = filterMoviesWithRatingOrWish(movies)

  if (!filteredMovies || filteredMovies.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">No movies available</p>
          <p className="mt-2 text-sm text-gray-300">Please try again later</p>
        </div>
      </div>
    )
  }

  return <MovieSwipeView movies={filteredMovies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
}
