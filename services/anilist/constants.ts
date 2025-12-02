/**
 * Constants for AniList GraphQL API service
 */
export const ANILIST = {
  /** AniList GraphQL API endpoint */
  API_ENDPOINT: 'https://graphql.anilist.co',
} as const

/**
 * Cache duration constants for AniList API requests
 * All durations are in milliseconds
 */
export const ANILIST_CACHE = {
  /** Cache duration for trending anime list (1 hour) */
  TRENDING: 60 * 60 * 1000,
  /** Cache duration for upcoming anime list (2 hours) */
  UPCOMING: 2 * 60 * 60 * 1000,
} as const
