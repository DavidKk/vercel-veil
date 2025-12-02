'use client'

import { Heart, Star } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import { favoriteAnime } from '@/app/actions/anime/index'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import Tooltip from '@/components/Tooltip'
import type { Anime } from '@/services/anilist/types'

interface AnimeCardProps {
  anime: Anime
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function AnimeCard({ anime, favoriteAvailable, isFavorited: initialIsFavorited }: AnimeCardProps) {
  const coverImageUrl = anime.coverImage
  // Format: Japanese name (Chinese) if available, otherwise fallback to English/Romaji
  const primaryTitle = anime.title.native || anime.title.english || anime.title.romaji || 'Unknown'
  let title = primaryTitle
  // Add Chinese title in parentheses if available
  if (anime.title.chinese && anime.title.chinese !== primaryTitle) {
    title = `${primaryTitle}（${anime.title.chinese}）`
  }
  // Add season number if available
  if (anime.seasonNumber && anime.seasonNumber > 1) {
    title = `${title} 第${anime.seasonNumber}季`
  }
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const hasUserInteracted = useRef(false)

  // Only update from prop if user hasn't interacted yet (initial mount or anime changed)
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, anime.tmdbId]) // Reset when anime changes

  // Get source badge text
  const getSourceBadgeText = () => {
    if (anime.sources.length > 1) {
      return 'Both Lists'
    }
    return null
  }

  const sourceBadgeText = getSourceBadgeText()

  // Format score (0-100 to 0-10)
  const formattedScore = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null

  // Check if anime is released and format start date
  const releaseInfo = (() => {
    let isReleased: boolean | null = null
    let formattedDate: string | null = null

    // Check status first
    if (anime.status === 'RELEASING' || anime.status === 'FINISHED') {
      isReleased = true
    } else if (anime.status === 'NOT_YET_RELEASED') {
      isReleased = false
    }

    // Format startDate as YYYY/MM/DD
    if (anime.startDate?.year && anime.startDate?.month && anime.startDate?.day) {
      const year = anime.startDate.year
      const month = String(anime.startDate.month).padStart(2, '0')
      const day = String(anime.startDate.day).padStart(2, '0')
      formattedDate = `${year}/${month}/${day}`

      // If status is not clear, check startDate
      if (isReleased === null) {
        const startDate = new Date(year, anime.startDate.month - 1, anime.startDate.day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        isReleased = startDate <= today
      }
    }

    if (isReleased === null) return null

    return {
      isReleased,
      formattedDate: formattedDate || null,
    }
  })()

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 transition-all hover:shadow-xl hover:ring-indigo-500">
      {/* Cover Image */}
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

      {/* Anime Information */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">{title}</h3>

        {/* Tags and Information */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* AniList Link */}
            {anime.anilistUrl && (
              <a
                href={anime.anilistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
              >
                AniList
              </a>
            )}
            {/* Year */}
            {anime.startDate?.year && (
              <Tooltip content="Start Year" position="top">
                <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">{anime.startDate.year}</span>
              </Tooltip>
            )}
            {/* Score - Priority: averageScore */}
            {formattedScore && (
              <Tooltip content="AniList Average Score" position="top">
                <span className="flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                  <Star size={12} className="fill-yellow-500 text-yellow-500" />
                  {formattedScore}
                </span>
              </Tooltip>
            )}
            {/* Popularity */}
            {anime.popularity && anime.popularity > 0 && (
              <Tooltip content="AniList Popularity" position="top">
                <span className="flex items-center gap-1 rounded-lg bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">🔥 {anime.popularity.toLocaleString()}</span>
              </Tooltip>
            )}
            {/* Episodes */}
            {anime.episodes && (
              <Tooltip content="Total Episodes" position="top">
                <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{anime.episodes} eps</span>
              </Tooltip>
            )}
          </div>
          {/* Genres */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.slice(0, 3).map((genre, index) => (
                <span key={index} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        {anime.description && <p className="flex-1 text-sm leading-relaxed text-gray-600 line-clamp-3">{anime.description.replace(/<[^>]*>/g, '')}</p>}

        {/* Favorite Button - Use mt-auto to push to bottom */}
        {anime.tmdbId && favoriteAvailable && (
          <div className="mt-auto pt-2">
            <button
              onClick={async () => {
                if (isFavoriting) return

                hasUserInteracted.current = true
                const newFavoriteState = !isFavorited
                setIsFavorited(newFavoriteState)
                setIsFavoriting(true)

                try {
                  const result = await favoriteAnime(anime.tmdbId!, newFavoriteState)

                  if (!result.success) {
                    setIsFavorited(!newFavoriteState)
                    alertRef.current?.show(result.message, { type: 'error' })
                  }
                } catch (error) {
                  setIsFavorited(!newFavoriteState)
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update favorite status'
                  alertRef.current?.show(errorMessage, { type: 'error' })
                } finally {
                  setIsFavoriting(false)
                }
              }}
              disabled={isFavoriting}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                isFavorited ? 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700' : 'border-indigo-600 text-indigo-600 hover:bg-indigo-50'
              }`}
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
