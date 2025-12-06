import { notFound } from 'next/navigation'

import { getFavoriteMovieIds, getMovieById, isFavoriteFeatureAvailable } from '@/app/actions/movies'
import { checkAccess } from '@/services/auth/access'

import MovieDetail from './MovieDetail'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

interface MovieDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function MovieDetailPage(props: MovieDetailPageProps) {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/movies' })

  const params = await props.params
  const { id } = params

  // Fetch movie data first (required)
  const movie = await getMovieById(id)

  if (!movie) {
    notFound()
  }

  // Fetch optional data (favorites) - don't block page rendering if this fails
  const [favoriteAvailable, favoriteIdsArray] = await Promise.all([
    isFavoriteFeatureAvailable(),
    isFavoriteFeatureAvailable()
      .then((available) => (available ? getFavoriteMovieIds() : Promise.resolve([])))
      .catch(() => []), // Gracefully handle errors - return empty array
  ])

  // Convert array to Set for efficient lookup
  const favoriteIds = new Set(favoriteIdsArray)

  return <MovieDetail movie={movie} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} />
}
