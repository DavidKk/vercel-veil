import { notFound } from 'next/navigation'

import { getAnimeById, getFavoriteAnimeIds, isFavoriteFeatureAvailable } from '@/app/actions/anime'
import { checkAccess } from '@/services/auth/access'

import AnimeDetail from './AnimeDetail'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AnimeDetailPage(props: AnimeDetailPageProps) {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/anime' })

  const params = await props.params
  const { id } = params

  // Fetch anime data first (required)
  const anime = await getAnimeById(id)

  if (!anime) {
    notFound()
  }

  // Fetch optional data (favorites) - don't block page rendering if this fails
  const [favoriteAvailable, favoriteIdsArray] = await Promise.all([
    isFavoriteFeatureAvailable(),
    isFavoriteFeatureAvailable()
      .then((available) => (available ? getFavoriteAnimeIds() : Promise.resolve([])))
      .catch(() => []), // Gracefully handle errors - return empty array
  ])

  // Convert array to Set for efficient lookup
  const favoriteIds = new Set(favoriteIdsArray)

  return <AnimeDetail anime={anime} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} />
}
