export function getTheTvdbApiKey(): string {
  const apiKey = process.env.THE_TVDB_API_KEY
  if (!apiKey) {
    throw new Error('THE_TVDB_API_KEY is not configured')
  }

  return apiKey
}

export function hasTheTvdbApiKey(): boolean {
  try {
    getTheTvdbApiKey()
    return true
  } catch {
    return false
  }
}
