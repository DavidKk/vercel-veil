'use client'

import { Heart } from 'feather-icons-react'
import Link from 'next/link'
import { useRef } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import Tooltip from '@/components/Tooltip'
import type { MergedMovie } from '@/services/maoyan/types'

import { GenreBadge, MaoyanBadge, RatingBadge, TMDBBadge, WishBadge, YearBadge } from './components/badges'
import { useFavoriteMovie } from './hooks/useFavoriteMovie'
import { getMovieDetailUrl, getReleaseInfo, getSourceBadgeText } from './utils/movieHelpers'

interface MovieCardProps {
  movie: MergedMovie
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function MovieCard({ movie, favoriteAvailable, isFavorited: initialIsFavorited, shareToken }: MovieCardProps) {
  const posterUrl = movie.tmdbPoster || movie.poster
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { isFavorited, isFavoriting, handleFavorite } = useFavoriteMovie({
    initialIsFavorited,
    movieId: movie.tmdbId,
    favoriteAvailable,
    shareToken,
    alertRef,
  })

  const sourceBadgeText = getSourceBadgeText(movie)
  const detailUrl = getMovieDetailUrl(movie, shareToken)
  const releaseInfo = getReleaseInfo(movie)

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white/5 backdrop-blur-md shadow-xl ring-1 ring-white/10 transition-all hover:shadow-2xl hover:ring-indigo-400/50 hover:bg-white/10">
      {/* Poster Image - Clickable */}
      <Link href={detailUrl} className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100 block">
        <LazyImage src={posterUrl} alt={movie.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        {/* Release Status Badge */}
        {releaseInfo && (
          <Tooltip content={releaseInfo.formattedDate} position="top">
            <div
              className={`absolute left-2 top-2 rounded-full px-2 py-1 text-xs font-semibold text-white shadow-lg cursor-pointer ${releaseInfo.isReleased ? 'bg-green-600' : 'bg-orange-600'}`}
            >
              {releaseInfo.isReleased ? 'NOW' : 'SOON'}
            </div>
          </Tooltip>
        )}
        {/* Source Badge */}
        {sourceBadgeText && (
          <div className="absolute right-2 top-2 rounded-full bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-lg cursor-pointer">{sourceBadgeText}</div>
        )}
      </Link>

      {/* Movie Information */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <Link href={detailUrl} className="line-clamp-2 text-lg font-semibold text-white hover:text-indigo-300 transition-colors">
          {movie.name}
        </Link>

        {/* Tags and Information */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
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
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.slice(0, 3).map((genre, index) => (
                <GenreBadge key={index} genre={genre} />
              ))}
            </div>
          )}
        </div>

        {/* Overview - Full text on desktop (masonry layout), preserve line breaks */}
        {movie.overview && <p className="flex-1 text-sm leading-relaxed text-gray-300 whitespace-pre-line">{movie.overview}</p>}

        {/* Favorite Button - Use mt-auto to push to bottom */}
        {movie.tmdbId && favoriteAvailable && (
          <div className="mt-auto">
            <button
              onClick={handleFavorite}
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
