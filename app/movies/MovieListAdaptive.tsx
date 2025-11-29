'use client'

import { useIsMobile } from '@/hooks/useMobile'
import type { MergedMovie } from '@/services/maoyan/types'

import MovieList from './MovieList'
import MovieListMobile from './MovieListMobile'

interface MovieListAdaptiveProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
  initialIsMobile: boolean
}

export default function MovieListAdaptive({ movies, favoriteAvailable, favoriteIds, shareToken, initialIsMobile }: MovieListAdaptiveProps) {
  const isMobile = useIsMobile(initialIsMobile)

  if (isMobile) {
    return <MovieListMobile movies={movies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
  }

  return <MovieList movies={movies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
}
