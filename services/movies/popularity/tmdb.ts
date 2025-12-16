import type { MergedMovie } from '@/services/maoyan/types'

import { MovieHotStatus } from './types'

/**
 * TMDB popularity thresholds
 */
const TMDB_POPULARITY_HIGHLY_ANTICIPATED = 50
const TMDB_POPULARITY_AVERAGE = 20
const TMDB_VOTE_COUNT_THRESHOLD = 50
const TMDB_HOT_SCORE_VERY_HOT = 100
const TMDB_HOT_SCORE_AVERAGE = 50

/**
 * Minimum rating threshold for low vote count movies to be considered very hot
 * Movies with low vote count need both high popularity AND high rating to be very hot
 */
const TMDB_LOW_VOTE_COUNT_MIN_RATING_FOR_VERY_HOT = 7.5

/**
 * Judge movie hot status using TMDB data
 * @param movie Movie data
 * @param today Current date
 * @param releaseDate Release date or null
 * @param isDateAfter Function to compare dates by date part only
 * @returns Movie hot status level
 */
export function judgeMovieHotStatusWithTMDB(movie: MergedMovie, today: Date, releaseDate: Date | null, isDateAfter: (date1: Date, date2: Date) => boolean): MovieHotStatus {
  const popularity = movie.popularity ?? 0
  const voteCount = movie.tmdbVoteCount ?? 0
  const voteAverage = movie.rating ?? 0

  // Not yet released movies
  if (releaseDate && isDateAfter(releaseDate, today)) {
    if (popularity > TMDB_POPULARITY_HIGHLY_ANTICIPATED) return MovieHotStatus.HIGHLY_ANTICIPATED
    if (popularity > TMDB_POPULARITY_AVERAGE) return MovieHotStatus.AVERAGE
    return MovieHotStatus.NICHE
  }

  // Just released movies (low vote count)
  // For movies with low vote count, require both high popularity AND high rating to be very hot
  // This prevents movies with low vote count but high popularity from being incorrectly marked as very hot
  if (voteCount < TMDB_VOTE_COUNT_THRESHOLD) {
    // For very hot: need both high popularity AND high rating
    if (popularity > TMDB_POPULARITY_HIGHLY_ANTICIPATED && voteAverage >= TMDB_LOW_VOTE_COUNT_MIN_RATING_FOR_VERY_HOT) {
      return MovieHotStatus.VERY_HOT
    }
    // For average: still use popularity threshold, but rating should be reasonable (>= 6.5)
    if (popularity > TMDB_POPULARITY_AVERAGE && voteAverage >= 6.5) {
      return MovieHotStatus.AVERAGE
    }
    return MovieHotStatus.NICHE
  }

  // Released for a while, combine popularity and rating
  const hotScore = popularity + voteAverage * Math.log(voteCount + 1)

  if (hotScore > TMDB_HOT_SCORE_VERY_HOT) return MovieHotStatus.VERY_HOT
  if (hotScore > TMDB_HOT_SCORE_AVERAGE) return MovieHotStatus.AVERAGE
  return MovieHotStatus.NICHE
}
