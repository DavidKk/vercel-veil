'use client'

import { Heart, Star } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import { favoriteMovie } from '@/app/actions/movies'
import { favoriteMovieWithToken } from '@/app/actions/movies-share'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import Tooltip from '@/components/Tooltip'
import type { MergedMovie } from '@/services/maoyan/types'

import LazyImage from './components/LazyImage'

interface MovieCardProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function MovieCard({ movie, favoriteAvailable, isFavorited: initialIsFavorited, shareToken }: MovieCardProps) {
  const posterUrl = movie.tmdbPoster || movie.poster
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const hasUserInteracted = useRef(false)

  // Only update from prop if user hasn't interacted yet (initial mount or movie changed)
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, movie.tmdbId]) // Reset when movie changes

  // Get source badge text
  const getSourceBadgeText = () => {
    if (movie.sources.length > 2) {
      return `${movie.sources.length} Sources`
    }
    if (movie.sources.length === 2) {
      return 'Both Lists'
    }
    return null
  }

  const sourceBadgeText = getSourceBadgeText()

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:ring-indigo-500">
      {/* Poster Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
        <LazyImage
          src={posterUrl}
          alt={movie.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          preloadDistance={1}
          onError={(e) => {
            // Use placeholder if image fails to load
            const target = e.target as HTMLImageElement
            target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect fill="%23e5e7eb" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E'
          }}
        />
        {/* Source Badge */}
        {sourceBadgeText && <div className="absolute right-2 top-2 rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-lg">{sourceBadgeText}</div>}
        {/* Wish Overlay */}
        {(() => {
          const wishCount = movie.wish || 0
          const tmdbCount = movie.tmdbVoteCount || 0
          const displayCount = Math.max(wishCount, tmdbCount)
          return displayCount > 0 ? (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
              <div className="flex items-center gap-1 text-white">
                <Heart size={16} className="fill-pink-400 text-pink-400" />
                <span className="text-xs">{displayCount.toLocaleString()}</span>
              </div>
            </div>
          ) : null
        })()}
      </div>

      {/* Movie Information */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{movie.name}</h3>

        {/* Tags and Information */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Source tags */}
            {movie.maoyanUrl && (
              <a
                href={movie.maoyanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:from-orange-700 hover:to-red-700 active:scale-95"
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
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
              >
                TMDB
              </a>
            )}
            {/* Year */}
            {movie.year && (
              <Tooltip content="Release Year" position="top">
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{movie.year}</span>
              </Tooltip>
            )}
            {/* Rating - Priority: TMDB rating > Maoyan score */}
            {(movie.rating || movie.score) && (
              <Tooltip content={movie.rating ? 'TMDB Rating' : 'Maoyan Score'} position="top">
                <span className="flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                  <Star size={12} className="fill-yellow-500 text-yellow-500" />
                  {movie.rating ? movie.rating.toFixed(1) : movie.score}
                </span>
              </Tooltip>
            )}
            {/* Wish/Vote count - Show the higher value */}
            {(() => {
              const wishCount = movie.wish || 0
              const tmdbCount = movie.tmdbVoteCount || 0
              const displayCount = Math.max(wishCount, tmdbCount)
              const source = tmdbCount > wishCount ? 'TMDB Vote Count' : 'Maoyan Wish Count'
              return displayCount > 0 ? (
                <Tooltip content={source} position="top">
                  <span className="flex items-center gap-1 rounded-lg bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">
                    <Heart size={12} className="fill-pink-500 text-pink-500" />
                    {displayCount.toLocaleString()}
                  </span>
                </Tooltip>
              ) : null
            })()}
          </div>
          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.slice(0, 3).map((genre, index) => (
                <span key={index} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Overview - Full text on desktop (masonry layout), preserve line breaks */}
        {movie.overview && <p className="flex-1 text-sm leading-relaxed text-gray-600 whitespace-pre-line">{movie.overview}</p>}

        {/* Favorite Button - Use mt-auto to push to bottom */}
        {movie.tmdbId && favoriteAvailable && (
          <div className="mt-auto">
            <button
              onClick={async () => {
                if (!movie.tmdbId || isFavoriting) return

                // Mark that user has interacted
                hasUserInteracted.current = true

                // Optimistic update: immediately update UI
                const newFavoriteState = !isFavorited
                setIsFavorited(newFavoriteState)
                setIsFavoriting(true)

                try {
                  const result = shareToken ? await favoriteMovieWithToken(movie.tmdbId, shareToken, newFavoriteState) : await favoriteMovie(movie.tmdbId, newFavoriteState)
                  if (!result.success) {
                    // Rollback on failure
                    setIsFavorited(!newFavoriteState)
                    alertRef.current?.show(result.message, { type: 'error' })
                  }
                  // If success, keep the new state (already set optimistically)
                } catch (error) {
                  // Rollback on error
                  setIsFavorited(!newFavoriteState)
                  const errorMessage = error instanceof Error ? error.message : 'Operation failed'
                  alertRef.current?.show(errorMessage, { type: 'error' })
                } finally {
                  setIsFavoriting(false)
                }
              }}
              disabled={isFavoriting}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                isFavorited ? 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={isFavorited ? 'Remove from favorites' : 'Add to TMDB favorites'}
            >
              <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
              <span>{isFavoriting ? 'Processing...' : isFavorited ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>
        )}
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
