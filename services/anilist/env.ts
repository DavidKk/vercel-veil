/**
 * Get AniList Access Token from environment variable
 * @returns Access token if configured, undefined otherwise
 * @note Default validity period: 1 year
 * @see https://anilist.co/settings/developer - For Personal Access Token (Recommended)
 * @see https://docs.anilist.co/guide/auth/authorization-code - For OAuth Authorization Code Grant
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
