import { fail } from '@/services/logger'

import { executeGraphQLQueryForMedia } from './graphql'
import type { AniListPageResponse, SeriesRoot } from './types'

/**
 * Fetch a single media by ID (for fetching relations of related media)
 */
export async function fetchMediaById(mediaId: number, options?: { noCache?: boolean }): Promise<AniListPageResponse['Page']['media'][0] | null> {
  const query = `
    query MediaById($id: Int) {
      Media(id: $id) {
        id
        title {
          romaji
          english
          native
        }
        relations {
          edges {
            relationType
            node {
              id
              title {
                romaji
                english
                native
              }
            }
          }
        }
        externalLinks {
          id
          url
          site
        }
      }
    }
  `

  try {
    const data = await executeGraphQLQueryForMedia(query, { id: mediaId }, { noCache: options?.noCache })
    return data.Media as AniListPageResponse['Page']['media'][0] | null
  } catch (error) {
    fail(`Failed to fetch media ${mediaId}:`, error)
    return null
  }
}

/**
 * Find series root from relations
 * Priority: PARENT > PREQUEL (recursive)
 * Returns the root node of the series, or null if not found
 */
export async function findSeriesRoot(
  mediaId: number,
  relations: AniListPageResponse['Page']['media'][0]['relations'],
  visitedIds: Set<number> = new Set(),
  options?: { noCache?: boolean }
): Promise<SeriesRoot | null> {
  // Prevent infinite loops
  if (visitedIds.has(mediaId)) {
    return null
  }
  visitedIds.add(mediaId)

  if (!relations?.edges || relations.edges.length === 0) {
    return null
  }

  // Priority 1: Find PARENT relation
  const parentRelation = relations.edges.find((edge) => edge.relationType === 'PARENT')
  if (parentRelation) {
    const parentNode = parentRelation.node
    return {
      anilistId: parentNode.id,
      title: {
        romaji: parentNode.title.romaji,
        english: parentNode.title.english || undefined,
        native: parentNode.title.native || undefined,
      },
    }
  }

  // Priority 2: Find PREQUEL relation and recursively search
  const prequelRelation = relations.edges.find((edge) => edge.relationType === 'PREQUEL')
  if (prequelRelation) {
    const prequelNode = prequelRelation.node
    // Fetch the prequel's relations to continue the search
    // Note: This requires an additional API call, but we'll fetch it if needed
    try {
      const prequelMedia = await fetchMediaById(prequelNode.id, options)
      if (prequelMedia?.relations) {
        const root = await findSeriesRoot(prequelNode.id, prequelMedia.relations, visitedIds, options)
        if (root) {
          return root
        }
      }
      // If no further relations, the prequel itself is the root
      return {
        anilistId: prequelNode.id,
        title: {
          romaji: prequelNode.title.romaji,
          english: prequelNode.title.english || undefined,
          native: prequelNode.title.native || undefined,
        },
      }
    } catch (error) {
      // If fetching fails, use the prequel as root
      fail(`Failed to fetch prequel relations for media ${prequelNode.id}:`, error)
      return {
        anilistId: prequelNode.id,
        title: {
          romaji: prequelNode.title.romaji,
          english: prequelNode.title.english || undefined,
          native: prequelNode.title.native || undefined,
        },
      }
    }
  }

  return null
}
