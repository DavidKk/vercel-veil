import { verifyShareToken } from '@/app/actions/movies-share'
import { getMergedMoviesList } from '@/services/maoyan'
import { getFavoriteMovies } from '@/services/tmdb'
import { hasTmdbAuth } from '@/services/tmdb/env'
import { isMobileDevice } from '@/utils/device'

import MovieListAdaptive from '../../MovieListAdaptive'
import MoviesPageContent from '../../MoviesPageContent'

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
    // Return 401 if token is invalid or expired
    // In Next.js App Router, we can't directly set status code in page components,
    // but we can show the error message
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">401 Unauthorized</h1>
          <p className="mt-2 text-gray-600">{verification.error === 'Token expired' ? 'This share link has expired (valid for 1 day)' : 'Invalid or expired share link'}</p>
          <p className="mt-4 text-sm text-gray-500">Please request a new share link from the owner.</p>
        </div>
      </div>
    )
  }

  // Fetch data (no authentication required for share page, but we still need to check if feature is available)
  const favoriteAvailable = hasTmdbAuth()
  const [movies, favoriteIdsSet, initialIsMobile] = await Promise.all([
    getMergedMoviesList().catch(() => []), // Allow to fail gracefully
    favoriteAvailable ? getFavoriteMovies().catch(() => new Set<number>()) : Promise.resolve(new Set<number>()),
    isMobileDevice(),
  ])

  // favoriteIdsSet is already a Set
  const favoriteIds = favoriteIdsSet instanceof Set ? favoriteIdsSet : new Set<number>()

  return (
    <MoviesPageContent hideShareButton={true}>
      <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
        <p className="font-semibold">Shared Access</p>
        <p className="mt-1">You have temporary access to add favorites. This link expires in 1 day.</p>
      </div>

      <MovieListAdaptive movies={movies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={token} initialIsMobile={initialIsMobile} />
    </MoviesPageContent>
  )
}
