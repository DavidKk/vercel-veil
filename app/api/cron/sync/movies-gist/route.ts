import { cron } from '@/initializer/controller'
import { info } from '@/services/logger'
import { updateMoviesGist } from '@/services/movies'

export const runtime = 'nodejs'

/**
 * Movies GIST sync cron job
 * Periodically updates the movies GIST cache with latest data from APIs
 * @param req Next.js request object
 * @returns Response with sync results
 */
export const GET = cron(async () => {
  info('Movies GIST sync cron job started')

  try {
    const { movies, cacheData } = await updateMoviesGist()

    info(`Movies GIST sync completed: ${movies.length} movies, ${cacheData.current.metadata.totalCount} total`)

    return {
      success: true,
      moviesCount: movies.length,
      totalCount: cacheData.current.metadata.totalCount,
      timestamp: cacheData.current.timestamp,
    }
  } catch (error) {
    info('Movies GIST sync failed:', error)
    throw error
  }
})
