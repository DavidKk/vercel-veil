/**
 * Get AniList Access Token from environment variable
 * @returns Access token if configured, undefined otherwise
 */
export function getAnilistAccessToken(): string | undefined {
  return process.env.ANILIST_ACCESS_TOKEN
}

/**
 * Check if AniList Access Token is configured
 * @returns true if access token is configured
 */
export function hasAnilistAccessToken(): boolean {
  return Boolean(getAnilistAccessToken())
}
