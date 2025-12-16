import { fail, info } from '@/services/logger'

import { ANILIST } from './constants'
import { getAnilistAccessToken, hasAnilistAccessToken } from './env'
import { executeGraphQLMutation } from './graphql'

/**
 * Add or remove anime from "Planning to Watch" list on AniList
 * @param mediaId AniList media ID
 * @param add Whether to add (true) or remove (false) from Planning to Watch list
 * @returns true if successful
 */
export async function toggleAnimePlanningList(mediaId: number, add = true): Promise<boolean> {
  if (!hasAnilistAccessToken()) {
    throw new Error('AniList authentication not configured. Planning list feature requires ANILIST_ACCESS_TOKEN. ' + 'Please set ANILIST_ACCESS_TOKEN environment variable.')
  }

  info(`${add ? 'Adding' : 'Removing'} anime ${mediaId} ${add ? 'to' : 'from'} Planning to Watch list`)

  // SaveMediaListEntry mutation: set status to PLANNING to add, or null to remove
  const mutation = `
    mutation SaveMediaListEntry($mediaId: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status) {
        id
        status
        media {
          id
          title {
            romaji
            english
            native
          }
        }
      }
    }
  `

  try {
    const variables = {
      mediaId,
      status: add ? ('PLANNING' as const) : null,
    }
    const data = await executeGraphQLMutation(mutation, variables)

    if (data.errors) {
      const errorMessages = data.errors.map((e: { message: string }) => e.message).join(', ')
      const errorDetails = {
        errors: data.errors,
        fullResponse: data,
        variables,
      }
      fail(`AniList ${add ? 'add' : 'remove'} to Planning list failed: ${errorMessages}`, errorDetails)
      throw new Error(`Failed to ${add ? 'add' : 'remove'} anime ${add ? 'to' : 'from'} Planning to Watch list: ${errorMessages}`)
    }

    return true
  } catch (error) {
    // Log detailed error information
    const errorDetails: Record<string, unknown> = {
      message: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      mediaId,
      action: add ? 'add' : 'remove',
    }

    // If error has additional properties, include them
    if (error instanceof Error) {
      if ('stack' in error) {
        errorDetails.stack = error.stack
      }
      if ('cause' in error) {
        errorDetails.cause = error.cause
      }
    }

    // Try to get response data if available
    if (error && typeof error === 'object' && 'response' in error) {
      errorDetails.response = error.response
    }

    fail(`AniList ${add ? 'add' : 'remove'} to Planning list error:`, errorDetails)
    fail(`AniList ${add ? 'add' : 'remove'} to Planning list error (raw):`, error)
    throw error
  }
}

/**
 * Get user's "Planning to Watch" anime IDs from AniList
 * @returns Set of AniList media IDs that are in Planning to Watch list
 */
export async function getPlanningAnimeIds(): Promise<Set<number>> {
  if (!hasAnilistAccessToken()) {
    return new Set()
  }

  info('Fetching Planning to Watch anime IDs from AniList')

  const query = `
    query GetPlanningList($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        mediaList(type: ANIME, status: PLANNING) {
          mediaId
          status
        }
        pageInfo {
          hasNextPage
          currentPage
        }
      }
    }
  `

  try {
    // Query current authenticated user's mediaList (no userName parameter = current user)
    // Use executeGraphQLMutation's approach but for query (requires auth, no cache)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    const accessToken = getAnilistAccessToken()
    if (!accessToken) {
      throw new Error('AniList access token is required for querying user mediaList')
    }
    headers.Authorization = `Bearer ${accessToken}`

    const planningIds = new Set<number>()
    let currentPage = 1
    const perPage = 500
    let hasNextPage = true

    // Fetch all pages to get complete list
    while (hasNextPage) {
      const variables = {
        page: currentPage,
        perPage,
      }

      const response = await fetch(ANILIST.API_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query,
          variables,
        }),
      })

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

      const result = (await response.json()) as {
        data?: {
          Page?: {
            mediaList?: Array<{ mediaId?: number; status?: string }>
            pageInfo?: { hasNextPage?: boolean; currentPage?: number }
          }
        }
        errors?: Array<{ message: string }>
      }

      if (result.errors) {
        throw new Error(`AniList GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}`)
      }

      if (!result.data) {
        throw new Error('AniList API: invalid response structure')
      }

      const entries = result.data.Page?.mediaList || []
      for (const entry of entries) {
        if (entry?.mediaId && entry?.status === 'PLANNING') {
          planningIds.add(entry.mediaId)
        }
      }

      // Check if there are more pages
      hasNextPage = result.data.Page?.pageInfo?.hasNextPage || false
      currentPage++

      // Safety limit: prevent infinite loops (max 10 pages = 5000 items)
      if (currentPage > 10) {
        info('Reached maximum page limit (10 pages) for Planning to Watch list')
        break
      }
    }

    info(`Found ${planningIds.size} anime in Planning to Watch list on AniList (fetched ${currentPage - 1} page(s))`)
    return planningIds
  } catch (error) {
    // Log detailed error information
    const errorDetails: Record<string, unknown> = {
      message: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    }

    // If error has additional properties, include them
    if (error instanceof Error) {
      if ('stack' in error) {
        errorDetails.stack = error.stack
      }
      if ('cause' in error) {
        errorDetails.cause = error.cause
      }
    }

    // Try to get response data if available
    if (error && typeof error === 'object' && 'response' in error) {
      errorDetails.response = error.response
    }

    fail('AniList get Planning list error:', errorDetails)
    fail('AniList get Planning list error (raw):', error)
    return new Set()
  }
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use toggleAnimePlanningList instead
 */
export async function toggleAnimeFavorite(mediaId: number, favorite = true): Promise<boolean> {
  return toggleAnimePlanningList(mediaId, favorite)
}

/**
 * Legacy function name for backward compatibility
 * @deprecated Use getPlanningAnimeIds instead
 */
export async function getFavoriteAnimeIds(): Promise<Set<number>> {
  return getPlanningAnimeIds()
}
