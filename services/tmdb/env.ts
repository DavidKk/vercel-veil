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

export function getTmdbSessionId(): string | undefined {
  return process.env.TMDB_SESSION_ID
}

export function hasTmdbSessionId(): boolean {
  return Boolean(process.env.TMDB_SESSION_ID)
}

export function hasTmdbAuth(): boolean {
  return hasTmdbSessionId()
}
