import { fetchJsonWithCache } from '@/services/fetch'

import { ANILIST } from './constants'
import { getAnilistAccessToken } from './env'
import type { AniListMediaResponse, AniListPageResponse } from './types'

/**
 * Options for GraphQL query execution
 */
export interface GraphQLQueryOptions {
  /** Disable cache (only works in development environment) */
  noCache?: boolean
}

/**
 * Execute GraphQL query to AniList API
 */
export async function executeGraphQLQuery(query: string, variables: Record<string, unknown>, options?: GraphQLQueryOptions): Promise<AniListPageResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Add Authorization header if access token is configured (optional, for better rate limits)
  const accessToken = getAnilistAccessToken()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  // Only disable cache in development environment
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const shouldDisableCache = isDevelopment && options?.noCache === true
  const cacheDuration = shouldDisableCache ? 0 : 60 * 1000 // 0 = no cache, 1 minute = default

  // Note: fetchJsonWithCache handles POST requests by including body in cache key
  const data = await fetchJsonWithCache<{ data?: AniListPageResponse; errors?: Array<{ message: string }> }>(ANILIST.API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
    cacheDuration,
  })

  if (data.errors) {
    throw new Error(`AniList GraphQL errors: ${data.errors.map((e) => e.message).join(', ')}`)
  }

  if (!data.data) {
    throw new Error('AniList API: invalid response structure')
  }

  return data.data
}

/**
 * Execute GraphQL mutation to AniList API
 * Mutations require authentication and should not be cached
 */
export async function executeGraphQLMutation(mutation: string, variables: Record<string, unknown>): Promise<{ data?: any; errors?: Array<{ message: string }> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Mutations require authentication
  const accessToken = getAnilistAccessToken()
  if (!accessToken) {
    throw new Error('AniList access token is required for mutations')
  }
  headers.Authorization = `Bearer ${accessToken}`

  // Mutations should not be cached
  const response = await fetch(ANILIST.API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: mutation,
      variables,
    }),
  })

  // Check HTTP status
  if (!response.ok) {
    const responseText = await response.text()
    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }
    throw new Error(`AniList API HTTP error: ${response.status} ${response.statusText}. Response: ${JSON.stringify(responseData)}`)
  }

  const data = (await response.json()) as { data?: any; errors?: Array<{ message: string }> }

  return data
}

/**
 * Execute GraphQL query that returns Viewer data (requires authentication)
 * This is similar to executeGraphQLMutation but for queries that need Viewer context
 */
export async function executeGraphQLQueryForViewer(query: string, variables: Record<string, unknown>): Promise<{ Viewer?: any }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Viewer queries require authentication
  const accessToken = getAnilistAccessToken()
  if (!accessToken) {
    throw new Error('AniList access token is required for Viewer queries')
  }
  headers.Authorization = `Bearer ${accessToken}`

  // Viewer queries should not be cached (user-specific data)
  const response = await fetch(ANILIST.API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  // Check HTTP status
  if (!response.ok) {
    const responseText = await response.text()
    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }
    throw new Error(`AniList API HTTP error: ${response.status} ${response.statusText}. Response: ${JSON.stringify(responseData)}`)
  }

  const data = (await response.json()) as { data?: { Viewer?: any }; errors?: Array<{ message: string }> }

  if (data.errors) {
    throw new Error(`AniList GraphQL errors: ${data.errors.map((e) => e.message).join(', ')}`)
  }

  if (!data.data) {
    throw new Error('AniList API: invalid response structure')
  }

  return data.data
}

/**
 * Execute GraphQL query to AniList API for single media
 */
export async function executeGraphQLQueryForMedia(query: string, variables: Record<string, unknown>, options?: GraphQLQueryOptions): Promise<AniListMediaResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  // Add Authorization header if access token is configured (optional, for better rate limits)
  const accessToken = getAnilistAccessToken()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  // Only disable cache in development environment
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const shouldDisableCache = isDevelopment && options?.noCache === true
  const cacheDuration = shouldDisableCache ? 0 : 60 * 1000 // 0 = no cache, 1 minute = default

  // Note: fetchJsonWithCache handles POST requests by including body in cache key
  const data = await fetchJsonWithCache<{ data?: AniListMediaResponse; errors?: Array<{ message: string }> }>(ANILIST.API_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
    cacheDuration,
  })

  if (data.errors) {
    throw new Error(`AniList GraphQL errors: ${data.errors.map((e) => e.message).join(', ')}`)
  }

  if (!data.data) {
    throw new Error('AniList API: invalid response structure')
  }

  return data.data
}
