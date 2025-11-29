'use client'

import { Heart } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import { favoriteMovie } from '@/app/actions/movies'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import type { MergedMovie } from '@/services/maoyan/types'

interface MovieCardProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  isFavorited: boolean
}

export default function MovieCard({ movie, favoriteAvailable, isFavorited: initialIsFavorited }: MovieCardProps) {
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
        <img
          src={posterUrl}
          alt={movie.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            // Use placeholder if image fails to load
            const target = e.target as HTMLImageElement
            target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect fill="%23e5e7eb" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E'
          }}
        />
        {/* Source Badge */}
        {sourceBadgeText && <div className="absolute right-2 top-2 rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-lg">{sourceBadgeText}</div>}
        {/* Rating/Wish Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
          <div className="flex flex-col gap-1">
            {movie.score && (
              <div className="flex items-center gap-1 text-white">
                <svg className="h-4 w-4 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
                <span className="text-sm font-semibold">{movie.score}</span>
              </div>
            )}
            {movie.wish !== undefined && movie.wish > 0 && (
              <div className="flex items-center gap-1 text-white">
                <svg className="h-4 w-4 fill-pink-400" viewBox="0 0 20 20">
                  <path d="M10 18.35l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-6.55 9.54L10 18.35z" />
                </svg>
                <span className="text-xs">{movie.wish.toLocaleString()} want to watch</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Movie Information */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{movie.name}</h3>

        {/* TMDB Information */}
        {movie.tmdbId && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {movie.year && <span className="rounded bg-gray-100 px-2 py-0.5">{movie.year}</span>}
              {movie.rating && (
                <span className="flex items-center gap-1 rounded bg-yellow-50 px-2 py-0.5 text-yellow-700">
                  <svg className="h-3 w-3 fill-yellow-500" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  {movie.rating.toFixed(1)}
                </span>
              )}
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
        )}

        {/* Overview */}
        {movie.overview && <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-gray-600">{movie.overview}</p>}

        {/* Action Buttons - Use mt-auto to push to bottom */}
        <div className="mt-auto flex gap-2">
          {movie.tmdbUrl && (
            <a
              href={movie.tmdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-700"
            >
              View Details
            </a>
          )}
          {movie.tmdbId && favoriteAvailable && (
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
                  const result = await favoriteMovie(movie.tmdbId, newFavoriteState)
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
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                isFavorited ? 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
              } disabled:cursor-not-allowed disabled:opacity-50`}
              title={isFavorited ? 'Remove from favorites' : 'Add to TMDB favorites'}
            >
              <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
              <span>{isFavoriting ? 'Processing...' : isFavorited ? 'Favorited' : 'Favorite'}</span>
            </button>
          )}
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
