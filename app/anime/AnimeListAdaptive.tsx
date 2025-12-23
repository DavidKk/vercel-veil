'use client'

import { useIsMobile } from '@/hooks/useMobile'
import type { Anime } from '@/services/anilist/types'

import AnimeList from './AnimeList'
import AnimeListMobile from './AnimeListMobile'

interface AnimeListAdaptiveProps {
  anime: Anime[]
  favoriteIds: Set<number>
  shareToken?: string
  initialIsMobile: boolean
}

export default function AnimeListAdaptive({ anime, favoriteIds, shareToken, initialIsMobile }: AnimeListAdaptiveProps) {
  const isMobile = useIsMobile(initialIsMobile)

  if (isMobile) {
    return <AnimeListMobile anime={anime} favoriteIds={favoriteIds} shareToken={shareToken} />
  }

  return <AnimeList anime={anime} favoriteIds={favoriteIds} shareToken={shareToken} />
}
