/**
 * Cron jobs configuration
 * This file defines all cron jobs that will be registered in vercel.json
 * Sensitive parameters (like URLs) can be stored in environment variables
 * and referenced here if needed in the future
 */
export interface CronJobConfig {
  path: string
  schedule: string
}

export const cronJobs: CronJobConfig[] = [
  {
    path: '/api/cron/sync/douban-to-tmdb',
    schedule: '0 3 * * *',
  },
  {
    path: '/api/cron/sync/movies-gist',
    schedule: '0 4,12,20 * * *',
  },
  {
    path: '/api/cron/notification/movies',
    schedule: '0 10 * * *',
  },
]
