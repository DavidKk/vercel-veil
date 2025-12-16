import { getAnimeListWithGistCache, getFavoriteAnimeIds, isFavoriteFeatureAvailable } from '@/app/actions/anime'
import { checkAccess } from '@/services/auth/access'
import { isMobileDevice } from '@/utils/device'

import AnimeListAdaptive from './AnimeListAdaptive'
import AnimePageContent from './AnimePageContent'

// Force dynamic rendering because we use cookies for authentication
export const dynamic = 'force-dynamic'

interface AnimePageProps {
  searchParams: Promise<{ noCache?: string; limit?: string }>
}

export default async function AnimePage(props: AnimePageProps) {
  // Require authentication to access this page
  await checkAccess({ isApiRouter: false, redirectUrl: '/anime' })

  // Parse searchParams to get options
  const searchParams = await props.searchParams
  const noCache = searchParams.noCache === 'true' || searchParams.noCache === '1'
  const limit = searchParams.limit ? parseInt(searchParams.limit, 10) : undefined

  // Fetch data on server side
  const [anime, favoriteIdsArray, initialIsMobile] = await Promise.all([
    getAnimeListWithGistCache({ noCache, limit }),
    isFavoriteFeatureAvailable().then((available) => (available ? getFavoriteAnimeIds() : Promise.resolve([]))),
    isMobileDevice(),
  ])

  // Filter out anime released more than 2 years ago
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

  const filteredAnime = anime.filter((item) => {
    // If no start date, keep the anime (might be upcoming)
    if (!item.startDate || !item.startDate.year) {
      return true
    }

    // Parse start date and compare with 2 years ago
    const startDate = new Date(item.startDate.year, (item.startDate.month || 1) - 1, item.startDate.day || 1)
    // Only filter out anime released more than 2 years ago
    return startDate >= twoYearsAgo
  })

  // Convert array to Set for efficient lookup
  const favoriteIds = new Set(favoriteIdsArray)

  return (
    <AnimePageContent>
      <AnimeListAdaptive anime={filteredAnime} favoriteIds={favoriteIds} shareToken={undefined} initialIsMobile={initialIsMobile} />
    </AnimePageContent>
  )
}
