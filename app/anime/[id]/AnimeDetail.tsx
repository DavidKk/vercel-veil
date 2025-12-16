'use client'

import { Heart } from 'feather-icons-react'
import { useRef } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import LazyImage from '@/components/LazyImage'
import Tooltip from '@/components/Tooltip'
import type { Anime } from '@/services/anilist/types'

import { AniListBadge, AnimeGenreBadge, AnimeScoreBadge, AnimeYearBadge, EpisodesBadge, PopularityBadge, TMDBBadge } from '../components/badges'
import { useFavoriteAnime } from '../hooks/useFavoriteAnime'
import { cleanDescription, formatAnimeTitle, getAnimeReleaseInfo, getAssociatedTitle, getSourceBadgeText } from '../utils/animeHelpers'

interface AnimeDetailProps {
  anime: Anime
  favoriteIds: Set<number>
}

export default function AnimeDetail({ anime, favoriteIds }: AnimeDetailProps) {
  const coverImageUrl = anime.coverImage
  const title = formatAnimeTitle(anime)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { isFavorited, isFavoriting, handleFavorite } = useFavoriteAnime({
    initialIsFavorited: anime.anilistId ? favoriteIds.has(anime.anilistId) : false,
    animeId: anime.anilistId,
    alertRef,
  })

  const sourceBadgeText = getSourceBadgeText(anime)
  const releaseInfo = getAnimeReleaseInfo(anime)

  // Format score (0-100 to 0-10)
  const formattedScore = anime.averageScore ? anime.averageScore / 10 : null

  // Get priority description: Chinese description from TMDB/TVDB > original description
  const priorityDescription = anime.tmdbDescription || anime.tvdbDescription || anime.description
  const hasChineseDescription = !!(anime.tmdbDescription || anime.tvdbDescription)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8 py-4 lg:py-6 xl:py-8">
        {/* Main Content */}
        <div className="rounded-3xl bg-white shadow-2xl ring-2 ring-pink-300 overflow-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
            {/* Cover Image Section */}
            <div className="relative xl:col-span-1">
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100">
                <LazyImage src={coverImageUrl} alt={title} className="h-full w-full object-cover" loading="eager" />
                {/* Release Status Badge */}
                {releaseInfo && releaseInfo.formattedDate && (
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
              <h1 className="text-xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent mb-3 lg:mb-4">
                {title}
              </h1>
              {/* TMDB/TVDB Title below main title (only if different from main title) */}
              {(() => {
                const associatedTitle = getAssociatedTitle(anime)
                return associatedTitle ? (
                  <p className="text-sm lg:text-base font-bold bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent mb-3 lg:mb-4">
                    {associatedTitle}
                  </p>
                ) : null
              })()}

              {/* Tags and Information */}
              <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-4 lg:mb-6">
                {/* Source tags */}
                {anime.anilistUrl && <AniListBadge url={anime.anilistUrl} />}
                {/* TMDB Badge */}
                {anime.tmdbUrl && <TMDBBadge url={anime.tmdbUrl} />}
                {/* Year */}
                {anime.startDate?.year && <AnimeYearBadge year={anime.startDate.year} tooltip="Start Year" />}
                {/* Score */}
                {formattedScore && <AnimeScoreBadge score={anime.averageScore!} />}
                {/* Popularity */}
                {anime.popularity && anime.popularity > 0 && <PopularityBadge popularity={anime.popularity} />}
                {/* Episodes */}
                {anime.episodes && <EpisodesBadge episodes={anime.episodes} />}
              </div>

              {/* Genres */}
              {anime.genres && anime.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 lg:gap-2 mb-4 lg:mb-6">
                  {anime.genres.map((genre, index) => (
                    <AnimeGenreBadge key={index} genre={genre} />
                  ))}
                </div>
              )}

              {/* Description - Priority: Chinese description from TMDB/TVDB > original description */}
              {priorityDescription && (
                <div className="mb-4 lg:mb-6">
                  {hasChineseDescription ? (
                    // Show TMDB or TVDB description with source label
                    <>
                      {anime.tmdbDescription && (
                        <p
                          className="text-sm lg:text-base leading-relaxed text-gray-600 whitespace-pre-line overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 7,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {cleanDescription(anime.tmdbDescription)}
                        </p>
                      )}
                      {!anime.tmdbDescription && anime.tvdbDescription && (
                        <p
                          className="text-sm lg:text-base leading-relaxed text-gray-600 whitespace-pre-line overflow-hidden"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 7,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {cleanDescription(anime.tvdbDescription)}
                        </p>
                      )}
                    </>
                  ) : (
                    // Show original AniList description (no label)
                    <p
                      className="text-sm lg:text-base leading-relaxed text-gray-600 whitespace-pre-line overflow-hidden"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 7,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {cleanDescription(anime.description)}
                    </p>
                  )}
                </div>
              )}

              {/* Start Date */}
              {releaseInfo && releaseInfo.formattedDate && (
                <div className="mb-4 lg:mb-6">
                  <h2 className="text-sm lg:text-lg font-semibold text-gray-800 mb-1.5 lg:mb-2">Start Date</h2>
                  <p className="text-sm lg:text-base text-gray-600">{releaseInfo.formattedDate}</p>
                </div>
              )}

              {/* Favorite Button */}
              {
                <div className="mt-auto pt-4 lg:pt-6">
                  <button
                    onClick={handleFavorite}
                    disabled={isFavoriting}
                    className={`flex w-full lg:w-auto items-center justify-center gap-1.5 lg:gap-2 rounded-xl px-4 py-2 lg:px-6 lg:py-3 text-sm lg:text-base font-bold transition-all shadow-md hover:shadow-lg ${
                      isFavorited ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-2 border-purple-300'
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                    title={isFavorited ? 'Remove from Planning to Watch' : 'Add to Planning to Watch'}
                  >
                    <Heart size={16} className="lg:w-5 lg:h-5" fill={isFavorited ? 'currentColor' : 'none'} />
                    <span>{isFavoriting ? 'Processing...' : isFavorited ? 'In List' : 'Add to List'}</span>
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
      <Alert ref={alertRef} />
    </div>
  )
}
