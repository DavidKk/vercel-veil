import { cron } from '@/initializer/controller'
import { standardResponseSuccess } from '@/initializer/response'
import { getAnimeListWithAutoUpdate } from '@/services/anime'
import { info } from '@/services/logger'

export const runtime = 'nodejs'

/**
 * Anime GIST sync cron job
 * Cron expression: 0 4,12,20 * * *
 * Executes at UTC 04:00, 12:00, 20:00 daily
 */
export const GET = cron(async () => {
  info('Anime GIST sync handler started')

  try {
    const anime = await getAnimeListWithAutoUpdate({
      includeTrending: true,
      includeUpcoming: true,
    })

    info(`Anime GIST sync completed successfully: ${anime.length} anime`)

    return standardResponseSuccess()
  } catch (error) {
    info('Anime GIST sync failed:', error)
    // Return success even on error to avoid retry loops
    // Errors are logged for monitoring
    return standardResponseSuccess()
  }
})
