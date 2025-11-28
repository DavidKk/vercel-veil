export function getTmdbApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is not configured')
  }

  return apiKey
}

export function hasTmdbApiKey(): boolean {
  try {
    getTmdbApiKey()
    return true
  } catch {
    return false
  }
}
