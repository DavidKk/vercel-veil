import { useEffect, useRef, useState } from 'react'

import { favoriteAnime } from '@/app/actions/anime'
import type { AlertImperativeHandler } from '@/components/Alert'

interface UseFavoriteAnimeOptions {
  initialIsFavorited: boolean
  animeId?: number
  alertRef: React.RefObject<AlertImperativeHandler | null>
}

/**
 * Custom hook for managing anime favorite state and actions
 */
export function useFavoriteAnime({ initialIsFavorited, animeId, alertRef }: UseFavoriteAnimeOptions) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const hasUserInteracted = useRef(false)

  // Only update from prop if user hasn't interacted yet (initial mount or anime changed)
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, animeId]) // Reset when anime changes

  const handleFavorite = async () => {
    if (!animeId || isFavoriting) return

    // Mark that user has interacted
    hasUserInteracted.current = true

    // Optimistic update: immediately update UI
    const newFavoriteState = !isFavorited
    setIsFavorited(newFavoriteState)
    setIsFavoriting(true)

    try {
      const result = await favoriteAnime(animeId, newFavoriteState)
      if (!result.success) {
        // Rollback on failure
        setIsFavorited(!newFavoriteState)
        alertRef.current?.show(result.message, { type: 'error' })
      }
      // If success, keep the new state (already set optimistically)
    } catch (error) {
      // Rollback on error
      setIsFavorited(!newFavoriteState)
      const errorMessage = error instanceof Error ? error.message : 'Operation failed'
      alertRef.current?.show(errorMessage, { type: 'error' })
    } finally {
      setIsFavoriting(false)
    }
  }

  return {
    isFavorited,
    isFavoriting,
    handleFavorite,
  }
}
