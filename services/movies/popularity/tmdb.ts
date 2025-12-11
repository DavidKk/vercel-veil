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
  if (voteCount < TMDB_VOTE_COUNT_THRESHOLD) {
    if (popularity > TMDB_POPULARITY_HIGHLY_ANTICIPATED) return MovieHotStatus.VERY_HOT
    if (popularity > TMDB_POPULARITY_AVERAGE) return MovieHotStatus.AVERAGE
    return MovieHotStatus.NICHE
  }

  // Released for a while, combine popularity and rating
  const hotScore = popularity + voteAverage * Math.log(voteCount + 1)

  if (hotScore > TMDB_HOT_SCORE_VERY_HOT) return MovieHotStatus.VERY_HOT
  if (hotScore > TMDB_HOT_SCORE_AVERAGE) return MovieHotStatus.AVERAGE
  return MovieHotStatus.NICHE
}
