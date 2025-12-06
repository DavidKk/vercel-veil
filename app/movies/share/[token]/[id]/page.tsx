import { notFound } from 'next/navigation'

import { getMovieById } from '@/app/actions/movies'
import { verifyShareToken } from '@/app/actions/movies/share'
import { hasTmdbAuth } from '@/services/tmdb/env'

import MovieDetail from '../../../[id]/MovieDetail'
import ShareTokenError from '../../components/ShareTokenError'
import { getFavoriteIdsForShare } from '../../utils/shareHelpers'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface MovieShareDetailPageProps {
  params: Promise<{ token: string; id: string }>
}

export default async function MovieShareDetailPage(props: MovieShareDetailPageProps) {
  const params = await props.params
  const { token, id } = params

  // Verify share token
  const verification = await verifyShareToken(token)
  if (!verification.valid) {
    return <ShareTokenError error={verification.error} />
  }

  // Fetch movie data first (required)
  const movie = await getMovieById(id)

  if (!movie) {
    notFound()
  }

  // Fetch optional data (favorites) - don't block page rendering if this fails
  const favoriteAvailable = hasTmdbAuth()
  const favoriteIds = await getFavoriteIdsForShare()

  return <MovieDetail movie={movie} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={token} />
}
