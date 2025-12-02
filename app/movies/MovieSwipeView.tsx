'use client'

import SwipeView from '@/components/SwipeView'
import type { MergedMovie } from '@/services/maoyan/types'

import ShareModal from './components/ShareModal'
import MovieSwipeCard from './MovieSwipeCard'

interface MovieSwipeViewProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieSwipeView({ movies, favoriteAvailable, favoriteIds, shareToken }: MovieSwipeViewProps) {
  return (
    <SwipeView
      items={movies}
      getImageUrl={(movie) => movie.tmdbPoster || movie.poster || null}
      renderItem={(movie) => {
        const isFavorited = movie.tmdbId ? favoriteIds.has(movie.tmdbId) : false
        return <MovieSwipeCard movie={movie} favoriteAvailable={favoriteAvailable} isFavorited={isFavorited} shareToken={shareToken} />
      }}
      getItemKey={(movie) => `${movie.source}-${movie.maoyanId}`}
      shareModal={<ShareModal isOpen={false} onClose={() => {}} />}
      shareToken={shareToken}
      emptyMessage={{ title: 'No movies available', description: 'Please try again later' }}
    />
  )
}
