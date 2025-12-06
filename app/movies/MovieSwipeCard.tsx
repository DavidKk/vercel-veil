'use client'

import { Heart } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import type { MergedMovie } from '@/services/maoyan/types'

import { GenreBadge, MaoyanBadge, RatingBadge, TMDBBadge, WishBadge, YearBadge } from './components/badges'
import { useFavoriteMovie } from './hooks/useFavoriteMovie'

interface MovieSwipeCardProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function MovieSwipeCard({ movie, favoriteAvailable, isFavorited: initialIsFavorited, shareToken }: MovieSwipeCardProps) {
  const posterUrl = movie.tmdbPoster || movie.poster
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { isFavorited, isFavoriting, handleFavorite } = useFavoriteMovie({
    initialIsFavorited,
    movieId: movie.tmdbId,
    favoriteAvailable,
    shareToken,
    alertRef,
  })

  // Reset details expanded state when movie changes
  useEffect(() => {
    setIsDetailsExpanded(false)
  }, [movie.tmdbId])

  return (
    <div className="relative flex h-full w-full flex-col text-white">
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col py-4 lg:py-6 gap-4 lg:gap-6 overflow-hidden">
        <div className="flex flex-col gap-4 lg:gap-6 flex-1 px-4 lg:px-6 min-h-0">
          {/* Poster Image */}
          <div
            className="relative aspect-[2/3] w-full max-w-[220px] lg:max-w-[260px] xl:max-w-[300px] mx-auto overflow-hidden rounded-xl bg-gray-800 shadow-2xl flex-shrink-0 max-h-[55vh]"
            style={{ display: isDetailsExpanded ? 'none' : 'block' }}
          >
            <LazyImage src={posterUrl} alt={movie.name} className="h-full w-full object-cover" loading="lazy" />
          </div>

          {/* Middle section - Movie info */}
          <div className="flex flex-col gap-3 lg:gap-4 flex-1 min-h-0">
            {/* Title, tags, genres with favorite button on the right */}
            <div className="flex items-center gap-3 flex-shrink-0 max-h-[25vh] overflow-hidden" style={{ display: isDetailsExpanded ? 'none' : 'flex' }}>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold leading-tight">{movie.name}</h2>
                <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                  {movie.maoyanUrl && <MaoyanBadge url={movie.maoyanUrl} />}
                  {movie.tmdbUrl && <TMDBBadge url={movie.tmdbUrl} />}
                  {movie.year && <YearBadge year={movie.year} />}
                  <RatingBadge rating={movie.rating} score={movie.score} />
                  <WishBadge wish={movie.wish} tmdbVoteCount={movie.tmdbVoteCount} />
                </div>
                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 flex-shrink-0 max-h-[10vh] overflow-hidden">
                    {movie.genres.slice(0, 3).map((genre, index) => (
                      <GenreBadge key={index} genre={genre} />
                    ))}
                  </div>
                )}
              </div>
              {/* Favorite button - centered vertically */}
              {movie.tmdbId && favoriteAvailable && (
                <div className="flex-shrink-0">
                  <button
                    onClick={handleFavorite}
                    disabled={isFavoriting}
                    className={`flex items-center justify-center rounded-full p-2 shadow-lg backdrop-blur-md transition-all ${
                      isFavorited ? 'bg-pink-500/90 text-white hover:bg-pink-600' : 'bg-white/20 text-white hover:bg-white/30'
                    } disabled:cursor-not-allowed disabled:opacity-50 active:scale-95`}
                    title={isFavorited ? 'Remove from favorites' : 'Add to TMDB favorites'}
                  >
                    <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                </div>
              )}
            </div>

            {/* Overview - Preserve line breaks */}
            {movie.overview && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <p className="text-sm leading-relaxed text-white/90 cursor-pointer line-clamp-6 whitespace-pre-line" onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}>
                  {movie.overview}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
