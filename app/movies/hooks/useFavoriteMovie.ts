import { useEffect, useRef, useState } from 'react'

import { favoriteMovie } from '@/app/actions/movies'
import { favoriteMovieWithToken } from '@/app/actions/movies/share'
import type { AlertImperativeHandler } from '@/components/Alert'

interface UseFavoriteMovieOptions {
  initialIsFavorited: boolean
  movieId?: number
  favoriteAvailable: boolean
  shareToken?: string
  alertRef: React.RefObject<AlertImperativeHandler | null>
}

/**
 * Custom hook for managing movie favorite state and actions
 */
export function useFavoriteMovie({ initialIsFavorited, movieId, favoriteAvailable, shareToken, alertRef }: UseFavoriteMovieOptions) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const hasUserInteracted = useRef(false)

  // Only update from prop if user hasn't interacted yet (initial mount or movie changed)
  useEffect(() => {
    if (!hasUserInteracted.current) {
      setIsFavorited(initialIsFavorited)
    }
  }, [initialIsFavorited, movieId]) // Reset when movie changes

  const handleFavorite = async () => {
    if (!movieId || isFavoriting || !favoriteAvailable) return

    // Mark that user has interacted
    hasUserInteracted.current = true

    // Optimistic update: immediately update UI
    const newFavoriteState = !isFavorited
    setIsFavorited(newFavoriteState)
    setIsFavoriting(true)

    try {
      const result = shareToken ? await favoriteMovieWithToken(movieId, shareToken, newFavoriteState) : await favoriteMovie(movieId, newFavoriteState)
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
