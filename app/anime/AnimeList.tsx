'use client'

import { useMemo, useState } from 'react'

import ClearableSelect from '@/components/ClearableSelect'
import type { Anime } from '@/services/anilist/types'

import AnimeCard from './AnimeCard'

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
  const filteredAnime = useMemo(() => {
    return anime.filter((item) => {
      const hasScore = item.averageScore !== undefined && item.averageScore > 0
      const hasPopularity = item.popularity !== undefined && item.popularity > 0
      return hasScore || hasPopularity
    })
  }, [anime])

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
          <p className="text-lg font-semibold text-gray-900">No anime available</p>
          <p className="mt-2 text-sm text-gray-600">Please try again later</p>
        </div>
      </div>
    )
  }

  // Desktop grid view only (mobile is handled in AnimeListMobile)
  return (
    <div className="space-y-6">
      {/* Sort Controls - Sticky */}
      <div className="hidden md:block sticky top-2 z-10">
        <div className="rounded-xl border border-gray-200/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-md ring-1 ring-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="hidden sm:block text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{sortedAnime.length}</span> anime
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
              <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
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
      <div className="columns-1 gap-6 sm:columns-2 lg:columns-3 xl:columns-4">
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
