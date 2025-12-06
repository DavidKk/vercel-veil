'use client'

import type { Anime } from '@/services/anilist/types'

import AnimeSwipeView from './AnimeSwipeView'
import { filterAnimeWithScoreOrPopularity } from './utils/animeHelpers'

interface AnimeListMobileProps {
  anime: Anime[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function AnimeListMobile({ anime, favoriteAvailable, favoriteIds, shareToken }: AnimeListMobileProps) {
  // Filter anime: only keep those with score or popularity data
  const filteredAnime = filterAnimeWithScoreOrPopularity(anime)

  if (!filteredAnime || filteredAnime.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">No anime available</p>
          <p className="mt-2 text-sm text-gray-400">Please try again later</p>
        </div>
      </div>
    )
  }

  return <AnimeSwipeView anime={filteredAnime} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
}
