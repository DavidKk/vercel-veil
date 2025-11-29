import { getFavoriteMovieIds, getMoviesList, isFavoriteFeatureAvailable } from '@/app/actions/movies'
import { checkAccess } from '@/services/auth/access'
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
    getMoviesList(),
    isFavoriteFeatureAvailable(),
    isFavoriteFeatureAvailable().then((available) => (available ? getFavoriteMovieIds() : Promise.resolve([]))),
    isMobileDevice(),
  ])

  // Filter out movies released more than 2 years ago
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const filteredMovies = movies.filter((movie) => {
    // If no release date, keep the movie (might be upcoming)
    if (!movie.releaseDate) {
      return true
    }

    // Parse release date and compare with 2 years ago
    const releaseDate = new Date(movie.releaseDate)
    // Only filter out movies released more than 2 years ago
    return releaseDate >= twoYearsAgo
  })

  // Convert array to Set for efficient lookup
  const favoriteIds = new Set(favoriteIdsArray)

  return (
    <MoviesPageContent>
      <MovieListAdaptive movies={filteredMovies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} initialIsMobile={initialIsMobile} />
    </MoviesPageContent>
  )
}
