import type { MergedMovie } from '@/services/maoyan/types'

import { MovieHotStatus } from './types'

/**
 * Maoyan wish count thresholds
 * Maoyan wish counts are typically much higher than TMDB vote counts
 */
const MAOYAN_WISH_HIGHLY_ANTICIPATED = 50000
const MAOYAN_WISH_AVERAGE = 10000
const MAOYAN_WISH_JUST_RELEASED_THRESHOLD = 10000
const MAOYAN_WISH_JUST_RELEASED_AVERAGE = 5000

/**
 * Maoyan score thresholds
 */
const MAOYAN_SCORE_VERY_HOT = 8.0
const MAOYAN_SCORE_AVERAGE = 7.0

/**
 * Maoyan popularity normalization factor
 * Scale: 100000 wish ≈ 50 popularity
 */
const MAOYAN_POPULARITY_NORMALIZATION_FACTOR = 2000
const MAOYAN_HOT_SCORE_VERY_HOT = 100
const MAOYAN_HOT_SCORE_AVERAGE = 50

/**
 * Parse Maoyan score safely
 * @param scoreString Score string
 * @returns Parsed score or 0 if invalid
 */
function parseMaoyanScore(scoreString: string | undefined): number {
  if (!scoreString) return 0
  const score = parseFloat(scoreString)
  // Check if score is valid (between 0 and 10 for Maoyan)
  if (isNaN(score) || score < 0 || score > 10) return 0
  return score
}

/**
 * Judge movie hot status using Maoyan data
 * @param movie Movie data
 * @param today Current date
 * @param releaseDate Release date or null
 * @param isDateAfter Function to compare dates by date part only
 * @returns Movie hot status level
 */
export function judgeMovieHotStatusWithMaoyan(movie: MergedMovie, today: Date, releaseDate: Date | null, isDateAfter: (date1: Date, date2: Date) => boolean): MovieHotStatus {
  const wish = movie.wish ?? 0
  const score = parseMaoyanScore(movie.score)
  const isMostExpected = movie.sources.includes('mostExpected')
  const isTopRated = movie.sources.includes('topRated')

  // Not yet released movies
  if (releaseDate && isDateAfter(releaseDate, today)) {
    // If in most expected list, it's highly anticipated
    if (isMostExpected && wish >= MAOYAN_WISH_HIGHLY_ANTICIPATED) return MovieHotStatus.HIGHLY_ANTICIPATED
    if (isMostExpected && wish >= MAOYAN_WISH_AVERAGE) return MovieHotStatus.AVERAGE
    if (wish >= MAOYAN_WISH_HIGHLY_ANTICIPATED) return MovieHotStatus.HIGHLY_ANTICIPATED
    if (wish >= MAOYAN_WISH_AVERAGE) return MovieHotStatus.AVERAGE
    return MovieHotStatus.NICHE
  }

  // Just released movies (low wish count indicates recent release)
  if (wish < MAOYAN_WISH_JUST_RELEASED_THRESHOLD) {
    // Top rated movies with good score are considered hot
    if (isTopRated && score >= MAOYAN_SCORE_VERY_HOT) return MovieHotStatus.VERY_HOT
    if (isTopRated && score >= MAOYAN_SCORE_AVERAGE) return MovieHotStatus.AVERAGE
    // Even with low wish count, if wish is relatively high, it might be hot
    if (wish >= MAOYAN_WISH_JUST_RELEASED_AVERAGE) return MovieHotStatus.AVERAGE
    return MovieHotStatus.NICHE
  }

  // Released for a while, combine wish count and score
  // Convert wish to a normalized score (similar to popularity)
  const normalizedPopularity = wish / MAOYAN_POPULARITY_NORMALIZATION_FACTOR
  const hotScore = normalizedPopularity + score * Math.log(wish / 1000 + 1)

  if (hotScore > MAOYAN_HOT_SCORE_VERY_HOT) return MovieHotStatus.VERY_HOT
  if (hotScore > MAOYAN_HOT_SCORE_AVERAGE) return MovieHotStatus.AVERAGE
  return MovieHotStatus.NICHE
}
