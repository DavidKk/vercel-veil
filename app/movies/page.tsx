import { getFavoriteMovieIds, getMoviesListWithGistCache, isFavoriteFeatureAvailable } from '@/app/actions/movies'
import { checkAccess } from '@/services/auth/access'
import { filterMoviesByCurrentYear } from '@/services/movies'
import { isMobileDevice } from '@/utils/device'

import MovieListAdaptive from './MovieListAdaptive'
import MoviesPageContent from './MoviesPageContent'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

export default async function MoviesPage() {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/movies' })

  // Fetch data on server side
  const [movies, favoriteAvailable, favoriteIdsArray, initialIsMobile] = await Promise.all([
    getMoviesListWithGistCache(),
    isFavoriteFeatureAvailable(),
    isFavoriteFeatureAvailable().then((available) => (available ? getFavoriteMovieIds() : Promise.resolve([]))),
    isMobileDevice(),
  ])

  // Filter movies to only include those released in the current year or later
  // This matches the notification logic and prevents old movies from being displayed
  const filteredMovies = filterMoviesByCurrentYear(movies)

  // Convert array to Set for efficient lookup
  const favoriteIds = new Set(favoriteIdsArray)

  return (
    <MoviesPageContent>
      <MovieListAdaptive movies={filteredMovies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} initialIsMobile={initialIsMobile} />
    </MoviesPageContent>
  )
}
