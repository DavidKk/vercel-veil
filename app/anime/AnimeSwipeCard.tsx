'use client'

import { Heart } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import type { Anime } from '@/services/anilist/types'

import { AniListBadge, AnimeGenreBadge, AnimeScoreBadge, AnimeYearBadge, EpisodesBadge, PopularityBadge, TMDBBadge } from './components/badges'
import { useFavoriteAnime } from './hooks/useFavoriteAnime'
import { cleanDescription, formatAnimeTitle, getAssociatedTitle } from './utils/animeHelpers'

interface AnimeSwipeCardProps {
  anime: Anime
  isFavorited: boolean
  shareToken?: string
}

export default function AnimeSwipeCard({ anime, isFavorited: initialIsFavorited }: AnimeSwipeCardProps) {
  const coverImageUrl = anime.coverImage
  const title = formatAnimeTitle(anime)
  const alertRef = useRef<AlertImperativeHandler>(null)
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false)

  const { isFavorited, isFavoriting, handleFavorite } = useFavoriteAnime({
    initialIsFavorited,
    animeId: anime.anilistId,
    alertRef,
  })

  // Reset details expanded state when anime changes
  useEffect(() => {
    setIsDetailsExpanded(false)
  }, [anime.anilistId])

  // Format score (0-100 to 0-10)
  const formattedScore = anime.averageScore ? anime.averageScore / 10 : null

  // Get priority description: Chinese description from TMDB/TVDB > original description
  const priorityDescription = anime.tmdbDescription || anime.tvdbDescription || anime.description
  const hasChineseDescription = !!(anime.tmdbDescription || anime.tvdbDescription)

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
                {/* TMDB/TVDB Title below main title (only if different from main title) */}
                {(() => {
                  const associatedTitle = getAssociatedTitle(anime)
                  return associatedTitle ? (
                    <p className="text-sm sm:text-base font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">{associatedTitle}</p>
                  ) : null
                })()}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {anime.anilistUrl && <AniListBadge url={anime.anilistUrl} />}
                  {/* TMDB Badge */}
                  {anime.tmdbUrl && <TMDBBadge url={anime.tmdbUrl} />}
                  {anime.startDate?.year && <AnimeYearBadge year={anime.startDate.year} tooltip="Start Year" variant="dark" />}
                  {formattedScore && <AnimeScoreBadge score={anime.averageScore!} variant="dark" />}
                  {anime.popularity && anime.popularity > 0 && <PopularityBadge popularity={anime.popularity} variant="dark" />}
                  {anime.episodes && <EpisodesBadge episodes={anime.episodes} variant="dark" />}
                </div>
                {/* Genres */}
                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {anime.genres.slice(0, 5).map((genre, index) => (
                      <AnimeGenreBadge key={index} genre={genre} variant="dark" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description - Priority: Chinese description from TMDB/TVDB > original description */}
            {priorityDescription && (
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
                {hasChineseDescription ? (
                  // Show TMDB or TVDB description with source label
                  <>
                    {anime.tmdbDescription && (
                      <p
                        className={`text-sm sm:text-base leading-relaxed text-white/80 whitespace-pre-line ${isDetailsExpanded ? '' : 'line-clamp-6'}`}
                        onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        style={{ cursor: 'pointer' }}
                      >
                        {cleanDescription(anime.tmdbDescription)}
                      </p>
                    )}
                    {!anime.tmdbDescription && anime.tvdbDescription && (
                      <p
                        className={`text-sm sm:text-base leading-relaxed text-white/80 whitespace-pre-line ${isDetailsExpanded ? '' : 'line-clamp-6'}`}
                        onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                        style={{ cursor: 'pointer' }}
                      >
                        {cleanDescription(anime.tvdbDescription)}
                      </p>
                    )}
                  </>
                ) : (
                  // Show original AniList description (no label)
                  <p
                    className={`text-sm sm:text-base leading-relaxed text-white/90 whitespace-pre-line ${isDetailsExpanded ? '' : 'line-clamp-6'}`}
                    onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
                    style={{ cursor: 'pointer' }}
                  >
                    {cleanDescription(anime.description)}
                  </p>
                )}
              </div>
            )}

            {/* Favorite Button */}
            {
              <div className="flex-shrink-0 pt-2">
                <button
                  onClick={handleFavorite}
                  disabled={isFavoriting}
                  className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    isFavorited ? 'border-pink-600 bg-pink-600 text-white hover:bg-pink-700' : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                  title={isFavorited ? 'Remove from Planning to Watch' : 'Add to Planning to Watch'}
                >
                  <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                  <span>{isFavoriting ? 'Processing...' : isFavorited ? 'In List' : 'Add to List'}</span>
                </button>
              </div>
            }
          </div>
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
