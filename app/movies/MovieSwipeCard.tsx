'use client'

import { Heart, Star } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import { favoriteMovie } from '@/app/actions/movies'
import { favoriteMovieWithToken } from '@/app/actions/movies/share'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import Tooltip from '@/components/Tooltip'
import type { MergedMovie } from '@/services/maoyan/types'

import LazyImage from './components/LazyImage'

interface MovieSwipeCardProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function MovieSwipeCard({ movie, favoriteAvailable, isFavorited: initialIsFavorited, shareToken }: MovieSwipeCardProps) {
  const posterUrl = movie.tmdbPoster || movie.poster
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const hasUserInteracted = useRef(false)

  // Only update from prop if user hasn't interacted yet
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, movie.tmdbId])

  // Reset details expanded state when movie changes
  useEffect(() => {
    setIsDetailsExpanded(false)
  }, [movie.tmdbId])

  return (
    <div className="relative flex h-full w-full flex-col text-white">
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col py-4 sm:py-6 gap-4 sm:gap-6 overflow-hidden">
        <div className="flex flex-col gap-4 sm:gap-6 flex-1 px-4 sm:px-6 min-h-0">
          {/* Poster Image */}
          <div
            className="relative aspect-[2/3] w-full max-w-[220px] sm:max-w-[260px] md:max-w-[300px] mx-auto overflow-hidden rounded-xl bg-gray-800 shadow-2xl flex-shrink-0 max-h-[55vh]"
            style={{ display: isDetailsExpanded ? 'none' : 'block' }}
          >
            <LazyImage src={posterUrl} alt={movie.name} className="h-full w-full object-cover" loading="eager" forceLoad={true} />
            {/* Source badge on poster */}
            {movie.sources.length > 1 && (
              <div className="absolute top-2 right-2">
                <div className="rounded-full bg-indigo-600/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">{movie.sources.length} Sources</div>
              </div>
            )}
          </div>

          {/* Middle section - Movie info */}
          <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-h-0">
            {/* Title, tags, genres with favorite button on the right */}
            <div className="flex items-center gap-3 flex-shrink-0 max-h-[25vh] overflow-hidden" style={{ display: isDetailsExpanded ? 'none' : 'flex' }}>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{movie.name}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {movie.maoyanUrl && (
                    <a
                      href={movie.maoyanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-orange-700 hover:to-red-700 active:scale-95"
                    >
                      {/* Maoyan brand name in Chinese - keep as Chinese logo, no need to translate */}
                      猫眼
                    </a>
                  )}
                  {movie.tmdbUrl && (
                    <a
                      href={movie.tmdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
                    >
                      TMDB
                    </a>
                  )}
                  {movie.year && (
                    <Tooltip content="Release Year" position="top">
                      <span className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">{movie.year}</span>
                    </Tooltip>
                  )}
                  {/* Rating - Priority: TMDB rating > Maoyan score */}
                  {(movie.rating || movie.score) && (
                    <Tooltip content={movie.rating ? 'TMDB Rating' : 'Maoyan Score'} position="top">
                      <span className="flex items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        <span>{movie.rating ? movie.rating.toFixed(1) : movie.score}</span>
                      </span>
                    </Tooltip>
                  )}
                  {(() => {
                    const wishCount = movie.wish || 0
                    const tmdbCount = movie.tmdbVoteCount || 0
                    const displayCount = Math.max(wishCount, tmdbCount)
                    const source = tmdbCount > wishCount ? 'TMDB Vote Count' : 'Maoyan Wish Count'
                    return displayCount > 0 ? (
                      <Tooltip content={source} position="top">
                        <span className="flex items-center gap-1.5 rounded-lg bg-pink-500/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                          <Heart size={14} className="fill-pink-400 text-pink-400" />
                          <span>{displayCount.toLocaleString()}</span>
                        </span>
                      </Tooltip>
                    ) : null
                  })()}
                </div>
                {/* Genres */}
                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 flex-shrink-0 max-h-[10vh] overflow-hidden">
                    {movie.genres.slice(0, 3).map((genre, index) => (
                      <span key={index} className="rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* Favorite button - centered vertically */}
              {movie.tmdbId && favoriteAvailable && (
                <div className="flex-shrink-0">
                  <button
                    onClick={async () => {
                      if (!movie.tmdbId || isFavoriting) return

                      hasUserInteracted.current = true

                      const newFavoriteState = !isFavorited
                      setIsFavorited(newFavoriteState)
                      setIsFavoriting(true)

                      try {
                        const result = shareToken ? await favoriteMovieWithToken(movie.tmdbId, shareToken, newFavoriteState) : await favoriteMovie(movie.tmdbId, newFavoriteState)
                        if (!result.success) {
                          setIsFavorited(!newFavoriteState)
                          alertRef.current?.show(result.message, { type: 'error' })
                        }
                      } catch (error) {
                        setIsFavorited(!newFavoriteState)
                        const errorMessage = error instanceof Error ? error.message : 'Operation failed'
                        alertRef.current?.show(errorMessage, { type: 'error' })
                      } finally {
                        setIsFavoriting(false)
                      }
                    }}
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
