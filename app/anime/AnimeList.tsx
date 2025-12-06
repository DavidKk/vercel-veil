'use client'

import { useMemo, useState } from 'react'

import ClearableSelect from '@/components/ClearableSelect'
import type { Anime } from '@/services/anilist/types'

import AnimeCard from './AnimeCard'
import { filterAnimeWithScoreOrPopularity } from './utils/animeHelpers'

type SortOption = 'score' | 'popularity' | 'trending' | ''

interface AnimeListProps {
  anime: Anime[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function AnimeList({ anime, favoriteAvailable, favoriteIds, shareToken }: AnimeListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('')

  // Filter anime: only keep those with score or popularity data
  const filteredAnime = useMemo(() => filterAnimeWithScoreOrPopularity(anime), [anime])

  // Sort anime based on selected option
  const sortedAnime = useMemo(() => {
    if (!sortBy) {
      return filteredAnime
    }

    return [...filteredAnime].sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.averageScore || 0
        const scoreB = b.averageScore || 0
        return scoreB - scoreA // Descending order
      } else if (sortBy === 'popularity') {
        const popA = a.popularity || 0
        const popB = b.popularity || 0
        return popB - popA // Descending order
      } else if (sortBy === 'trending') {
        const trendA = a.trending || 0
        const trendB = b.trending || 0
        return trendB - trendA // Descending order
      }
      return 0
    })
  }, [filteredAnime, sortBy])

  if (!sortedAnime || sortedAnime.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">No anime available</p>
          <p className="mt-2 text-sm text-gray-500">Please try again later</p>
        </div>
      </div>
    )
  }

  // Desktop grid view only (mobile is handled in AnimeListMobile)
  return (
    <div className="space-y-6">
      {/* Sort Controls - Sticky */}
      <div className="hidden lg:block sticky top-20 z-10">
        <div className="rounded-2xl border-2 border-pink-300 bg-white px-4 py-3 shadow-md">
          <div className="flex items-center justify-between">
            <div className="hidden sm:block text-sm font-bold text-gray-700">
              <span className="text-pink-500">{sortedAnime.length}</span> anime
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
              <label htmlFor="sort-select" className="text-sm font-bold text-gray-700">
                Sort by:
              </label>
              <ClearableSelect
                value={sortBy}
                placeholder="Default"
                onChange={(value) => setSortBy((value || '') as SortOption)}
                options={[
                  { value: 'score', label: 'Score (High to Low)' },
                  { value: 'popularity', label: 'Popularity (High to Low)' },
                  { value: 'trending', label: 'Trending (High to Low)' },
                ]}
                clearable={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Anime Masonry Layout - Desktop only */}
      <div className="columns-1 gap-4 lg:columns-3 2xl:columns-4">
        {sortedAnime.map((item) => {
          const isFavorited = item.tmdbId ? favoriteIds.has(item.tmdbId) : false
          return (
            <div key={`${item.source}-${item.anilistId}`} className="break-inside-avoid mb-6">
              <AnimeCard anime={item} favoriteAvailable={favoriteAvailable} isFavorited={isFavorited} shareToken={shareToken} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
