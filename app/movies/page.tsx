import { getFavoriteMovieIds, getMoviesList, isFavoriteFeatureAvailable } from '@/app/actions/movies'
import { checkAccess } from '@/services/auth/access'

import MovieList from './MovieList'
import MoviesPageContent from './MoviesPageContent'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

export default async function MoviesPage() {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/movies' })

  // Fetch data on server side
  const [movies, favoriteAvailable, favoriteIdsArray] = await Promise.all([
    getMoviesList(),
    isFavoriteFeatureAvailable(),
    isFavoriteFeatureAvailable().then((available) => (available ? getFavoriteMovieIds() : Promise.resolve([]))),
  ])

  // Convert array to Set for efficient lookup
  const favoriteIds = new Set(favoriteIdsArray)

  return (
    <MoviesPageContent>
      <MovieList movies={movies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} />
    </MoviesPageContent>
  )
}
