'use client'

import { Heart } from 'feather-icons-react'
import Link from 'next/link'
import { useRef } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import Tooltip from '@/components/Tooltip'
import type { Anime } from '@/services/anilist/types'

import { AniListBadge, AnimeGenreBadge, AnimeScoreBadge, AnimeYearBadge, EpisodesBadge, PopularityBadge } from './components/badges'
import { useFavoriteAnime } from './hooks/useFavoriteAnime'
import { formatAnimeTitle, getAnimeDetailUrl, getAnimeReleaseInfo, getSourceBadgeText } from './utils/animeHelpers'

interface AnimeCardProps {
  anime: Anime
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function AnimeCard({ anime, favoriteAvailable, isFavorited: initialIsFavorited }: AnimeCardProps) {
  const coverImageUrl = anime.coverImage
  const title = formatAnimeTitle(anime)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const detailUrl = getAnimeDetailUrl(anime)

  const { isFavorited, isFavoriting, handleFavorite } = useFavoriteAnime({
    initialIsFavorited,
    animeId: anime.tmdbId,
    favoriteAvailable,
    alertRef,
  })

  const sourceBadgeText = getSourceBadgeText(anime)
  const releaseInfo = getAnimeReleaseInfo(anime)

  // Format score (0-100 to 0-10)
  const formattedScore = anime.averageScore ? anime.averageScore / 10 : null

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-pink-200 transition-all hover:shadow-xl hover:ring-pink-400 hover:scale-[1.02]">
      {/* Cover Image */}
      <Link href={detailUrl}>
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
          <LazyImage src={coverImageUrl} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
          {/* Release Status Badge */}
          {releaseInfo && releaseInfo.formattedDate && (
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
        </div>
      </Link>

      {/* Anime Information */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4 bg-white">
        <Link href={detailUrl}>
          <h3 className="line-clamp-2 text-lg font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 transition-all">
            {title}
          </h3>
        </Link>

        {/* Tags and Information */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* AniList Link */}
            {anime.anilistUrl && <AniListBadge url={anime.anilistUrl} />}
            {/* Year */}
            {anime.startDate?.year && <AnimeYearBadge year={anime.startDate.year} tooltip="Start Year" />}
            {/* Score */}
            {formattedScore && <AnimeScoreBadge score={anime.averageScore!} variant="light" />}
            {/* Popularity */}
            {anime.popularity && anime.popularity > 0 && <PopularityBadge popularity={anime.popularity} variant="light" />}
            {/* Episodes */}
            {anime.episodes && <EpisodesBadge episodes={anime.episodes} variant="light" />}
          </div>
          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.slice(0, 3).map((genre, index) => (
                <AnimeGenreBadge key={index} genre={genre} />
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {anime.description && <p className="flex-1 text-sm leading-relaxed text-gray-500 line-clamp-3">{anime.description.replace(/<[^>]*>/g, '')}</p>}

        {/* Favorite Button - Use mt-auto to push to bottom */}
        {anime.tmdbId && favoriteAvailable && (
          <div className="mt-auto pt-2">
            <button
              onClick={handleFavorite}
              disabled={isFavoriting}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all active:scale-95 shadow-md hover:shadow-lg ${
                isFavorited ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-2 border-purple-300'
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
