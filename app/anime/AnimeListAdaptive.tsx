'use client'

import { useIsMobile } from '@/hooks/useMobile'
import type { Anime } from '@/services/anilist/types'

import AnimeList from './AnimeList'
import AnimeListMobile from './AnimeListMobile'

interface AnimeListAdaptiveProps {
  anime: Anime[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
  initialIsMobile: boolean
}

export default function AnimeListAdaptive({ anime, favoriteAvailable, favoriteIds, shareToken, initialIsMobile }: AnimeListAdaptiveProps) {
  const isMobile = useIsMobile(initialIsMobile)

  if (isMobile) {
    return <AnimeListMobile anime={anime} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
  }

  return <AnimeList anime={anime} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
}
