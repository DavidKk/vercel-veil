import { findSeriesRoot } from './relations'
import type { AniListPageResponse, Anime } from './types'
import { extractTmdbIdFromExternalLinks } from './utils'

/**
 * Convert AniList media to Anime type
 */
export async function convertAniListMediaToAnime(media: AniListPageResponse['Page']['media'][0], source: 'trending' | 'upcoming', options?: { noCache?: boolean }): Promise<Anime> {
  const coverImage = media.coverImage?.extraLarge || media.coverImage?.large || undefined
  const studios = media.studios?.nodes?.map((s) => s.name) || []

  // Find series root from relations
  const seriesRoot = await findSeriesRoot(media.id, media.relations, new Set(), options)

  // Extract TMDB ID and URL from externalLinks if available
  const tmdbId = extractTmdbIdFromExternalLinks(media.externalLinks)
  const tmdbUrl = media.externalLinks?.find((link) => link.site === 'TMDB' || link.site === 'The Movie Database')?.url

  return {
    anilistId: media.id,
    title: {
      romaji: media.title.romaji,
      english: media.title.english || undefined,
      native: media.title.native || undefined,
    },
    coverImage,
    bannerImage: media.bannerImage || undefined,
    description: media.description || undefined,
    averageScore: media.averageScore || undefined,
    popularity: media.popularity || undefined,
    trending: media.trending || undefined,
    status: media.status,
    format: media.format,
    episodes: media.episodes || undefined,
    duration: media.duration || undefined,
    startDate: media.startDate
      ? {
          year: media.startDate.year || undefined,
          month: media.startDate.month || undefined,
          day: media.startDate.day || undefined,
        }
      : undefined,
    endDate: media.endDate
      ? {
          year: media.endDate.year || undefined,
          month: media.endDate.month || undefined,
          day: media.endDate.day || undefined,
        }
      : undefined,
    season: media.season || undefined,
    seasonYear: media.seasonYear || undefined,
    genres: media.genres || undefined,
    studios: studios.length > 0 ? studios : undefined,
    sourceType: media.source || undefined,
    source: source,
    sources: [source],
    anilistUrl: media.siteUrl,
    seriesRoot: seriesRoot || undefined,
    tmdbId: tmdbId || undefined,
    tmdbUrl: tmdbUrl || undefined,
  }
}
