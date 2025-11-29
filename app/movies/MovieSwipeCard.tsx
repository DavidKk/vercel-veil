'use client'

import { Heart } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import { favoriteMovie } from '@/app/actions/movies'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import type { MergedMovie } from '@/services/maoyan/types'

interface MovieSwipeCardProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  isFavorited: boolean
}

export default function MovieSwipeCard({ movie, favoriteAvailable, isFavorited: initialIsFavorited }: MovieSwipeCardProps) {
  const posterUrl = movie.tmdbPoster || movie.poster
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [isPosterHidden, setIsPosterHidden] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const hasUserInteracted = useRef(false)

  // Only update from prop if user hasn't interacted yet
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, movie.tmdbId])

  // Reset poster visibility when movie changes
  useEffect(() => {
    setIsPosterHidden(false)
  }, [movie.tmdbId])

  return (
    <div className="flex h-screen w-full flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* Full-screen poster background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={posterUrl}
          alt={movie.name}
          className="h-full w-full object-cover opacity-40"
          loading="eager"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src =
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect fill="%231f2937" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col py-6 gap-6 overflow-hidden">
        <div className="flex flex-col gap-6 flex-1 px-6 overflow-y-auto min-h-0">
          {/* Poster Image */}
          {!isPosterHidden && (
            <div
              className="relative aspect-[2/3] w-full max-w-xs mx-auto overflow-hidden rounded-xl bg-gray-800 shadow-2xl flex-shrink-0 cursor-pointer transition-all duration-300"
              onClick={() => setIsPosterHidden(true)}
            >
              <img
                src={posterUrl}
                alt={movie.name}
                className="h-full w-full object-cover"
                loading="eager"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect fill="%231f2937" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E'
                }}
              />
              {/* Source badge on poster */}
              {movie.sources.length > 1 && (
                <div className="absolute top-2 right-2">
                  <div className="rounded-full bg-indigo-600/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">{movie.sources.length} Sources</div>
                </div>
              )}
              {/* Click hint overlay */}
              <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                <div className="rounded-full bg-black/40 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">点击隐藏封面</div>
              </div>
            </div>
          )}

          {/* Show poster button when hidden */}
          {isPosterHidden && (
            <button
              onClick={() => setIsPosterHidden(false)}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 transition-colors self-center flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              显示封面
            </button>
          )}

          {/* Middle section - Movie info */}
          <div className="flex flex-col gap-4">
            {/* Title and basic info */}
            <div className="flex flex-col gap-3">
              <h2 className="text-3xl font-bold leading-tight">{movie.name}</h2>
              <div className="flex flex-wrap items-center gap-3">
                {movie.year && <span className="rounded-lg bg-white/20 px-3 py-1 text-sm backdrop-blur-sm">{movie.year}</span>}
                {movie.rating && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-yellow-500/20 px-3 py-1 text-sm backdrop-blur-sm">
                    <svg className="h-4 w-4 fill-yellow-400" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                    <span className="font-semibold">{movie.rating.toFixed(1)}</span>
                  </span>
                )}
                {movie.wish !== undefined && movie.wish > 0 && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-pink-500/20 px-3 py-1 text-sm backdrop-blur-sm">
                    <svg className="h-4 w-4 fill-pink-400" viewBox="0 0 20 20">
                      <path d="M10 18.35l-1.45-1.32C5.4 14.36 2 11.28 2 7.5 2 4.42 4.42 2 7.5 2c1.74 0 3.41.81 4.5 2.09C13.09 2.81 14.76 2 16.5 2 19.58 2 22 4.42 22 7.5c0 3.78-3.4 6.86-6.55 9.54L10 18.35z" />
                    </svg>
                    <span>{movie.wish.toLocaleString()}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {movie.genres.slice(0, 3).map((genre, index) => (
                  <span key={index} className="rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && <p className="text-sm leading-relaxed text-white/90">{movie.overview}</p>}
          </div>
        </div>

        {/* Bottom section - Action buttons */}
        <div className="flex gap-3 flex-shrink-0 mt-auto px-6">
          {movie.tmdbUrl && (
            <a
              href={movie.tmdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-center text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800"
            >
              View Details
            </a>
          )}
          {movie.tmdbId && favoriteAvailable && (
            <button
              onClick={async () => {
                if (!movie.tmdbId || isFavoriting) return

                hasUserInteracted.current = true

                const newFavoriteState = !isFavorited
                setIsFavorited(newFavoriteState)
                setIsFavoriting(true)

                try {
                  const result = await favoriteMovie(movie.tmdbId, newFavoriteState)
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
              className={`flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                isFavorited
                  ? 'border-pink-500 bg-pink-500/20 text-white backdrop-blur-sm hover:bg-pink-500/30'
                  : 'border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20'
              } disabled:cursor-not-allowed disabled:opacity-50 active:scale-95`}
              title={isFavorited ? 'Remove from favorites' : 'Add to TMDB favorites'}
            >
              <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
              <span>{isFavoriting ? '...' : isFavorited ? 'Favorited' : 'Favorite'}</span>
            </button>
          )}
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
