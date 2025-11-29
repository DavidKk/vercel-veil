'use client'

import type { MergedMovie } from '@/services/maoyan/types'

import MovieCard from './MovieCard'

interface MovieListProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
}

export default function MovieList({ movies, favoriteAvailable, favoriteIds }: MovieListProps) {
  if (!movies || movies.length === 0) {
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
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {movies.map((movie) => (
        <MovieCard
          key={`${movie.source}-${movie.maoyanId}`}
          movie={movie}
          favoriteAvailable={favoriteAvailable}
          isFavorited={movie.tmdbId ? favoriteIds.has(movie.tmdbId) : false}
        />
      ))}
    </div>
  )
}
