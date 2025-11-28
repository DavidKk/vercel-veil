import { fail, info } from '@/services/logger'
import { request } from '@/services/request'
import { getTheTvdbApiKey } from '@/services/thetvdb/env'

import { TOKEN_EXPIRATION_TIME, TVDB_API_BASE_URL } from './conf'

export interface AccessTokenResp {
  data: {
    token: string
  }
}

let cachedToken: string | null = null
let tokenExpirationTime = 0
let tokenPromise: Promise<string> | null = null

export async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < tokenExpirationTime) {
    info('TVDB token cache hit')
    return cachedToken
  }

  if (!tokenPromise) {
    const apiKey = getTheTvdbApiKey()

    info('Fetching new TVDB token')
    const body = JSON.stringify({ apikey: apiKey })

    tokenPromise = request('POST', `${TVDB_API_BASE_URL}/login`, { body })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch TVDB token: ${response.statusText}`)
        }

        const json = (await response.json()) as AccessTokenResp
        const token = json.data.token
        cachedToken = token
        tokenExpirationTime = now + TOKEN_EXPIRATION_TIME
        info('TVDB token refreshed')
        return token
      })
      .catch((error) => {
        fail('TVDB token fetch failed', error)
        throw error
      })
      .finally(() => {
        tokenPromise = null
      })
  } else {
    info('Reusing in-flight TVDB token request')
  }

  return tokenPromise
}
