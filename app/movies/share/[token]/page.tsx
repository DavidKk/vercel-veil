import { getMoviesListFromCacheForShare } from '@/app/actions/movies'
import { verifyShareToken } from '@/app/actions/movies/share'
import { hasTmdbAuth } from '@/services/tmdb/env'
import { isMobileDevice } from '@/utils/device'

import MovieListAdaptive from '../../MovieListAdaptive'
import MoviesPageContent from '../../MoviesPageContent'
import ShareTokenError from '../components/ShareTokenError'
import { getFavoriteIdsForShare } from '../utils/shareHelpers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface SharePageProps {
  params: Promise<{ token: string }>
}

export default async function MoviesSharePage(props: SharePageProps) {
  const params = await props.params
  const { token } = params

  // Verify share token
  const verification = await verifyShareToken(token)
  if (!verification.valid) {
    return <ShareTokenError error={verification.error} />
  }

  // Fetch data (no authentication required for share page, but we still need to check if feature is available)
  // Use cache to avoid unnecessary API requests
  const favoriteAvailable = hasTmdbAuth()
  const [movies, favoriteIds, initialIsMobile] = await Promise.all([
    getMoviesListFromCacheForShare(true).catch(() => []), // Allow to fail gracefully, skip auth for share pages
    getFavoriteIdsForShare(),
    isMobileDevice(),
  ])

  return (
    <MoviesPageContent>
      <div className="mb-4 rounded-lg bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 p-4 text-sm text-blue-200">
        <p className="font-semibold text-white">Shared Access</p>
        <p className="mt-1">You have temporary access to add favorites. This link expires in 1 day.</p>
      </div>

      <MovieListAdaptive movies={movies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={token} initialIsMobile={initialIsMobile} />
    </MoviesPageContent>
  )
}
