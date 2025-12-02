'use client'

import { Heart, Star } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import { favoriteAnime } from '@/app/actions/anime/index'
import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import Tooltip from '@/components/Tooltip'
import type { Anime } from '@/services/anilist/types'

interface AnimeSwipeCardProps {
  anime: Anime
  favoriteAvailable: boolean
  isFavorited: boolean
  shareToken?: string
}

export default function AnimeSwipeCard({ anime, favoriteAvailable, isFavorited: initialIsFavorited }: AnimeSwipeCardProps) {
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
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)

  // Reset details expanded state when anime changes
  useEffect(() => {
    setIsDetailsExpanded(false)
  }, [anime.anilistId])

  // Only update from prop if user hasn't interacted yet
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, anime.tmdbId])

  // Format score (0-100 to 0-10)
  const formattedScore = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null

  return (
    <div className="relative flex h-full w-full flex-col text-white">
      {/* Content */}
      <div className="relative z-10 flex h-full flex-col py-4 sm:py-6 gap-4 sm:gap-6 overflow-hidden">
        <div className="flex flex-col gap-4 sm:gap-6 flex-1 px-4 sm:px-6 min-h-0">
          {/* Cover Image */}
          <div
            className="relative aspect-[2/3] w-full max-w-[220px] sm:max-w-[260px] md:max-w-[300px] mx-auto overflow-hidden rounded-xl bg-gray-800 shadow-2xl flex-shrink-0 max-h-[55vh]"
            style={{ display: isDetailsExpanded ? 'none' : 'block' }}
          >
            <LazyImage src={coverImageUrl} alt={title} className="h-full w-full object-cover" loading="lazy" />
          </div>

          {/* Middle section - Anime info */}
          <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-h-0">
            {/* Title, tags, genres */}
            <div className="flex items-center gap-3 flex-shrink-0 max-h-[25vh] overflow-hidden" style={{ display: isDetailsExpanded ? 'none' : 'flex' }}>
              <div className="flex-1 flex flex-col gap-2 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">{title}</h2>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {anime.anilistUrl && (
                    <a
                      href={anime.anilistUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
                    >
                      AniList
                    </a>
                  )}
                  {anime.startDate?.year && (
                    <Tooltip content="Start Year" position="top">
                      <span className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">{anime.startDate.year}</span>
                    </Tooltip>
                  )}
                  {formattedScore && (
                    <Tooltip content="AniList Average Score" position="top">
                      <span className="flex items-center gap-1 rounded-lg bg-yellow-500/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                        <Star size={12} className="fill-white text-white" />
                        {formattedScore}
                      </span>
                    </Tooltip>
                  )}
                  {anime.popularity && anime.popularity > 0 && (
                    <Tooltip content="AniList Popularity" position="top">
                      <span className="flex items-center gap-1 rounded-lg bg-pink-500/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
                        🔥 {anime.popularity.toLocaleString()}
                      </span>
                    </Tooltip>
                  )}
                  {anime.episodes && (
                    <Tooltip content="Total Episodes" position="top">
                      <span className="rounded-lg bg-blue-500/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">{anime.episodes} eps</span>
                    </Tooltip>
                  )}
                </div>
                {/* Genres */}
                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {anime.genres.slice(0, 5).map((genre, index) => (
                      <span key={index} className="rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {anime.description && (
              <div className="flex-1 min-h-0 overflow-y-auto">
                <p
                  className={`text-sm sm:text-base leading-relaxed text-white/90 whitespace-pre-line ${isDetailsExpanded ? '' : 'line-clamp-6'}`}
                  onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                  style={{ cursor: 'pointer' }}
                >
                  {anime.description.replace(/<[^>]*>/g, '')}
                </p>
              </div>
            )}

            {/* Favorite Button */}
            {anime.tmdbId && favoriteAvailable && (
              <div className="flex-shrink-0 pt-2">
                <button
                  onClick={async () => {
                    if (isFavoriting || !anime.tmdbId) return

                    hasUserInteracted.current = true
                    const newFavoriteState = !isFavorited
                    setIsFavorited(newFavoriteState)
                    setIsFavoriting(true)

                    try {
                      const result = await favoriteAnime(anime.tmdbId, newFavoriteState)

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
                    isFavorited ? 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700' : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isFavorited ? 'Remove from favorites' : 'Add to TMDB favorites'}
                >
                  <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                  <span>{isFavoriting ? 'Processing...' : isFavorited ? 'Favorited' : 'Favorite'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
