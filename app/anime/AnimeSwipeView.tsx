'use client'

import SwipeView from '@/components/SwipeView'
import type { Anime } from '@/services/anilist/types'

import AnimeSwipeCard from './AnimeSwipeCard'
import ShareModal from './components/ShareModal'

interface AnimeSwipeViewProps {
  anime: Anime[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function AnimeSwipeView({ anime, favoriteAvailable, favoriteIds, shareToken }: AnimeSwipeViewProps) {
  return (
    <SwipeView
      items={anime}
      getImageUrl={(item) => item.tmdbPoster || item.coverImage || null}
      renderItem={(item) => {
        const isFavorited = item.tmdbId ? favoriteIds.has(item.tmdbId) : false
        return <AnimeSwipeCard anime={item} favoriteAvailable={favoriteAvailable} isFavorited={isFavorited} shareToken={shareToken} />
      }}
      getItemKey={(item) => `${item.source}-${item.anilistId}`}
      shareModal={<ShareModal isOpen={false} onClose={() => {}} />}
      shareToken={shareToken}
      emptyMessage={{ title: 'No anime available', description: 'Please try again later' }}
    />
  )
}
