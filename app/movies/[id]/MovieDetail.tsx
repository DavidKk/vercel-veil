'use client'

import { Heart } from 'feather-icons-react'
import { useRef } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import Tooltip from '@/components/Tooltip'
import type { MergedMovie } from '@/services/maoyan/types'

import { GenreBadge, MaoyanBadge, RatingBadge, TMDBBadge, WishBadge, YearBadge } from '../components/badges'
import { useFavoriteMovie } from '../hooks/useFavoriteMovie'
import { getReleaseInfo, getSourceBadgeText } from '../utils/movieHelpers'

interface MovieDetailProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieDetail({ movie, favoriteAvailable, favoriteIds, shareToken }: MovieDetailProps) {
  const posterUrl = movie.tmdbPoster || movie.poster
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { isFavorited, isFavoriting, handleFavorite } = useFavoriteMovie({
    initialIsFavorited: movie.tmdbId ? favoriteIds.has(movie.tmdbId) : false,
    movieId: movie.tmdbId,
    favoriteAvailable,
    shareToken,
    alertRef,
  })

  const sourceBadgeText = getSourceBadgeText(movie)
  const releaseInfo = getReleaseInfo(movie)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8 py-4 lg:py-6 xl:py-8">
        {/* Main Content */}
        <div className="rounded-2xl bg-white/5 backdrop-blur-md shadow-2xl ring-1 ring-white/10 overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
            {/* Poster Section */}
            <div className="relative xl:col-span-1">
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
                <LazyImage src={posterUrl} alt={movie.name} className="h-full w-full object-cover" loading="eager" />
                {/* Release Status Badge */}
                {releaseInfo && (
                  <Tooltip content={releaseInfo.formattedDate} position="top">
                    <div
                      className={`absolute left-2 top-2 lg:left-4 lg:top-4 rounded-full px-2 py-1 lg:px-3 lg:py-1.5 text-xs lg:text-sm font-semibold text-white shadow-lg cursor-pointer ${releaseInfo.isReleased ? 'bg-green-600' : 'bg-orange-600'}`}
                    >
                      {releaseInfo.isReleased ? 'NOW' : 'SOON'}
                    </div>
                  </Tooltip>
                )}
                {/* Source Badge */}
                {sourceBadgeText && (
                  <div className="absolute right-2 top-2 lg:right-4 lg:top-4 rounded-full bg-indigo-600 px-2 py-1 lg:px-3 lg:py-1.5 text-xs lg:text-sm font-semibold text-white shadow-lg cursor-pointer">
                    {sourceBadgeText}
                  </div>
                )}
              </div>
            </div>

            {/* Details Section */}
            <div className="xl:col-span-2 flex flex-col p-4 lg:p-6 xl:p-10">
              {/* Title */}
              <h1 className="text-xl lg:text-3xl xl:text-4xl font-bold text-white mb-3 lg:mb-4">{movie.name}</h1>

              {/* Tags and Information */}
              <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
                {/* Source tags */}
                {movie.maoyanUrl && <MaoyanBadge url={movie.maoyanUrl} />}
                {movie.tmdbUrl && <TMDBBadge url={movie.tmdbUrl} />}
                {/* Year */}
                {movie.year && <YearBadge year={movie.year} />}
                {/* Rating - Priority: TMDB rating > Maoyan score */}
                <RatingBadge rating={movie.rating} score={movie.score} />
                {/* Wish/Vote count - Show the higher value */}
                <WishBadge wish={movie.wish} tmdbVoteCount={movie.tmdbVoteCount} />
              </div>

              {/* Genres */}
              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 lg:gap-2 mb-4 lg:mb-6">
                  {movie.genres.map((genre, index) => (
                    <GenreBadge key={index} genre={genre} />
                  ))}
                </div>
              )}

              {/* Overview */}
              {movie.overview && (
                <div className="mb-4 lg:mb-6">
                  <h2 className="text-sm lg:text-lg font-semibold text-white mb-1.5 lg:mb-2">Overview</h2>
                  <p className="text-sm lg:text-base leading-relaxed text-gray-300 whitespace-pre-line">{movie.overview}</p>
                </div>
              )}

              {/* Release Date */}
              {releaseInfo && (
                <div className="mb-4 lg:mb-6">
                  <h2 className="text-sm lg:text-lg font-semibold text-white mb-1.5 lg:mb-2">Release Date</h2>
                  <p className="text-sm lg:text-base text-gray-300">{releaseInfo.formattedDate}</p>
                </div>
              )}

              {/* Favorite Button */}
              {movie.tmdbId && favoriteAvailable && (
                <div className="mt-auto pt-4 lg:pt-6">
                  <button
                    onClick={handleFavorite}
                    disabled={isFavoriting}
                    className={`flex w-full lg:w-auto items-center justify-center gap-1.5 lg:gap-2 rounded-lg border px-4 py-2 lg:px-6 lg:py-3 text-sm lg:text-base font-medium transition-colors ${
                      isFavorited ? 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    title={isFavorited ? 'Remove from favorites' : 'Add to TMDB favorites'}
                  >
                    <Heart size={16} className="lg:w-5 lg:h-5" fill={isFavorited ? 'currentColor' : 'none'} />
                    <span>{isFavoriting ? 'Processing...' : isFavorited ? 'Favorited' : 'Favorite'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
