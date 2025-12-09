import type { NextRequest } from 'next/server'

import { xml } from '@/initializer/controller'
import { xmlNewznabError } from '@/initializer/response'
import { searchByEpisode, searchByTerm } from '@/services/acgrip'
import { verifyApiKey } from '@/services/auth/api'
import { fail, info } from '@/services/logger'
import { generateNewznabCaps, generateNewznabRSS } from '@/utils/newznab'

import { ACGRIP_CAPABILITIES, getACGRIPChannelMetadata } from './config'
import { convertToNewznabItems, generateMockNewznabItem } from './converter'

export const runtime = 'nodejs'

/**
 * Handle Newznab API requests for ACG.RIP Indexer
 *
 * Request processing flow:
 * 1. Parse request type (t parameter)
 * 2. Verify API Key (except for caps requests)
 * 3. Route to corresponding handler based on request type:
 *    - caps: Return indexer capabilities (supported categories, search types, etc.)
 *    - search: General search request (by term)
 *    - tvsearch: TV search request (supports episode, season, TVDB ID search)
 * 4. Return Newznab format XML response
 *
 * @param req Next.js request object
 * @returns Newznab format XML response
 */
export const GET = xml(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const t = searchParams.get('t')

  // Verify API Key (caps requests don't require authentication)
  const authError = verifyApiKeyForRequest(req, t)
  if (authError) {
    return authError
  }

  // Handle caps request: return indexer capabilities
  if (t === 'caps') {
    info('Newznab caps request')
    return generateNewznabCaps(ACGRIP_CAPABILITIES)
  }

  // Handle search request: general search (by term)
  if (t === 'search') {
    const q = searchParams.get('q')
    return await handleSearchByTerm(req, q)
  }

  // Handle tvsearch request: TV search (supports episode, season, TVDB ID)
  if (t === 'tvsearch') {
    return await handleTVSearchRequest(req, searchParams)
  }

  // Unknown request type
  return xmlNewznabError(`Unknown request type: ${t || 'missing'}`, 400)
})

/**
 * Verify API key for authenticated endpoints
 * @param req Next.js request object
 * @param requestType Request type for logging
 * @returns Error response if verification fails, null if successful
 */
function verifyApiKeyForRequest(req: NextRequest, requestType: string | null): ReturnType<typeof xmlNewznabError> | null {
  if (requestType === 'caps') {
    // Caps endpoint doesn't require auth
    return null
  }

  if (!verifyApiKey(req)) {
    const { searchParams } = new URL(req.url)
    const receivedKey = searchParams.get('apikey')
    const hasSecret = !!process.env.API_SECRET
    fail(`API key verification failed. Request type: ${requestType}, Has API_SECRET: ${hasSecret}, Received key: ${receivedKey ? `${receivedKey.substring(0, 4)}...` : 'none'}`)
    return xmlNewznabError('Invalid or missing API key. Please check API_SECRET environment variable and Sonarr indexer API Key configuration.', 401)
  }

  return null
}

/**
 * Handle search request by term
 * @param req Next.js request object
 * @param q Query string
 * @returns Search results XML response
 */
async function handleSearchByTerm(req: NextRequest, q: string | null): Promise<ReturnType<typeof generateNewznabRSS> | ReturnType<typeof xmlNewznabError>> {
  if (!q) {
    info('Newznab search test request (no query parameter), returning mock test data')
    const mockItem = generateMockNewznabItem(req)
    return generateNewznabRSS([mockItem], getACGRIPChannelMetadata(req))
  }

  info(`Newznab search request: q=${q}`)

  try {
    // Use term-based search (fetches from ACG.RIP RSS with term parameter)
    const items = await searchByTerm(q)
    // Default to season 1 for search requests
    const newznabItems = convertToNewznabItems(items, 1)
    info(`Newznab search for term "${q}" found ${newznabItems.length} items`)
    return generateNewznabRSS(newznabItems, getACGRIPChannelMetadata(req))
  } catch (error) {
    fail('Error processing search request:', error)
    return xmlNewznabError('Error processing search request', 400)
  }
}

/**
 * Handle tvsearch request with season and episode
 * @param req Next.js request object
 * @param q Query string
 * @param season Season number
 * @param ep Episode number (used as absolute episode number)
 * @returns Search results XML response
 */
async function handleTVSearchByEpisode(
  req: NextRequest,
  q: string | null,
  season: string,
  ep: string
): Promise<ReturnType<typeof generateNewznabRSS> | ReturnType<typeof xmlNewznabError>> {
  const seasonNum = parseInt(season, 10)
  const episodeNum = parseInt(ep, 10)

  if (isNaN(seasonNum) || isNaN(episodeNum)) {
    return xmlNewznabError('Invalid season or episode number', 400)
  }

  // Sonarr is configured to use absolute episode numbers
  // Use episodeNum directly as absolute episode number
  const absoluteEpisode = episodeNum

  if (!q) {
    info('Newznab tvsearch by episode: no query provided, returning empty results')
    return generateNewznabRSS([], getACGRIPChannelMetadata(req))
  }

  info(`Newznab tvsearch by episode: term="${q}", season=${seasonNum}, ep=${episodeNum}, absolute=${absoluteEpisode}`)

  try {
    // Search by base term (without season) to get all results
    // Then filter by absolute episode number from cached results
    const items = await searchByEpisode(q, absoluteEpisode)
    const newznabItems = convertToNewznabItems(items, seasonNum, episodeNum, absoluteEpisode)
    info(`Newznab tvsearch for term "${q}" absolute episode ${absoluteEpisode} (S${seasonNum}E${episodeNum}) found ${newznabItems.length} items`)
    return generateNewznabRSS(newznabItems, getACGRIPChannelMetadata(req))
  } catch (error) {
    fail('Error processing tvsearch request:', error)
    return xmlNewznabError('Error processing tvsearch request', 400)
  }
}

/**
 * Handle tvsearch request
 * @param req Next.js request object
 * @param searchParams URL search parameters
 * @returns Search results XML response
 */
async function handleTVSearchRequest(req: NextRequest, searchParams: URLSearchParams): Promise<ReturnType<typeof generateNewznabRSS> | ReturnType<typeof xmlNewznabError>> {
  // Debug: log full URL to see what's actually received
  info(`Newznab tvsearch request - full URL: ${req.url}`)

  const season = searchParams.get('season')
  const ep = searchParams.get('ep')
  const q = searchParams.get('q')

  // Debug: log search params
  info(`Newznab tvsearch request - season=${season || 'null'}, ep=${ep || 'null'}, q=${q || 'null'}`)

  // If season and ep are provided, search by base query and filter by absolute episode number
  if (season && ep) {
    return await handleTVSearchByEpisode(req, q, season, ep)
  }

  // If query is provided (without season/ep), use term search
  if (q) {
    return await handleSearchByTerm(req, q)
  }

  // No valid search parameters provided - return mock data (for Sonarr test requests)
  // This allows Sonarr to test the connection and verify category configuration
  info('Newznab tvsearch test request (no search parameters), returning mock test data')
  const mockItem = generateMockNewznabItem(req)
  return generateNewznabRSS([mockItem], getACGRIPChannelMetadata(req))
}
