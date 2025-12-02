import { cron } from '@/initializer/controller'
import { standardResponseSuccess } from '@/initializer/response'
import { info } from '@/services/logger'
import { updateMoviesGist } from '@/services/movies'

export const runtime = 'nodejs'

/**
 * Movies GIST sync cron job
 * Cron expression: 0 4,12,20 * * *
 * Executes at UTC 04:00, 12:00, 20:00 daily
 */
export const GET = cron(async () => {
  info('Movies GIST sync handler started')

  const { movies, cacheData } = await updateMoviesGist()

  info(`Movies GIST sync completed: ${movies.length} movies, ${cacheData.current.metadata.totalCount} total`)

  return standardResponseSuccess()
})
