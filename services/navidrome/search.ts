import { fail, info } from '@/services/logger'
import { chunk } from '@/utils/chunk'

import { request } from './request'

/**
 * Search result item data structure
 * Represents a single song from Navidrome search results
 */
export interface SearchItem {
  /** Unique identifier for the song */
  id: string
  /** Song title */
  title: string
  /** Artist name */
  artist: string
  /** Album name */
  album: string
  /** Song duration in seconds, optional */
  duration?: number
  /** Cover art identifier, optional */
  cover?: string
}

/**
 * Search result type
 * Represents the list of songs returned from search
 */
export type SearchResult = SearchItem[]

/**
 * Execute a single search query
 *
 * Searches for songs through Navidrome API's search3.view endpoint
 *
 * @param query - Search query string
 */
export async function search(query: string): Promise<SearchResult> {
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('Invalid query: must be a non-empty string')
  }

  info(`Searching Navidrome for: ${query}`)
  const data = await request('/rest/search3.view', { query: query.trim() })
  const songs = data['subsonic-response'].searchResult3?.song || []

  const result = songs.map((song) => ({
    id: song.id,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    cover: song.coverArt,
  }))

  info(`Navidrome search completed: ${result.length} results for "${query}"`)
  return result
}

/**
 * Batch search result item
 * Represents search results for a single query
 */
export interface BatchSearchItem {
  /** Original query string */
  query: string
  /** List of song IDs matched by this query */
  songsIds: string[]
}

/**
 * Batch search result
 * Contains results for all queries and merged song list
 */
export interface BatchSearchResult {
  /** Search results for each query */
  queries: BatchSearchItem[]
  /** Merged song list from all query results (deduplicated) */
  songs: SearchResult
}

/**
 * Execute batch search queries
 *
 * Executes multiple search queries in parallel and returns results for each query
 * along with a merged song list. Since Navidrome API doesn't support true batch
 * search, this function implements batch search by making parallel calls to
 * individual search requests.
 *
 * @param queries - Array of search query strings
 */
export async function batchSearch(queries: string[]): Promise<BatchSearchResult> {
  if (!Array.isArray(queries) || queries.length === 0) {
    throw new Error('Invalid queries: must be a non-empty array')
  }

  info(`Batch search started: ${queries.length} queries`)

  const chunks = chunk(queries, 50)
  const songsMap = new Map<string, SearchItem>() // For deduplication
  const queryResults: BatchSearchItem[] = []

  for (const chunk of chunks) {
    // Validate all queries are strings
    for (const query of chunk) {
      if (typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Invalid query: all queries must be non-empty strings')
      }
    }

    const searchPromises = chunk.map(async (q) => {
      const query = q.trim()
      try {
        const response = await search(query)
        // Deduplicate songs by ID
        for (const song of response) {
          if (!songsMap.has(song.id)) {
            songsMap.set(song.id, song)
          }
        }

        const songsIds = response.map((song) => song.id)
        return { query, songsIds }
      } catch (error) {
        fail(`Error searching for query "${query}":`, error)
        return { query, songsIds: [] }
      }
    })

    const searchResults = await Promise.all(searchPromises)
    queryResults.push(...searchResults)
  }

  // Convert map to array
  const songs = Array.from(songsMap.values())

  info(`Batch search completed: ${songs.length} unique songs from ${queries.length} queries`)

  return { queries: queryResults, songs }
}
