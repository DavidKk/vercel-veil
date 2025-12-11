'use client'

import { useMemo, useState } from 'react'

import ClearableSelect from '@/components/ClearableSelect'
import type { MergedMovie } from '@/services/maoyan/types'

import MovieSwipeView from './MovieSwipeView'
import { filterMoviesWithRatingOrWish, getReleaseInfo } from './utils/movieHelpers'

type ReleaseFilter = 'all' | 'released' | 'upcoming'

interface MovieListMobileProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
  shareToken?: string
}

export default function MovieListMobile({ movies, favoriteAvailable, favoriteIds, shareToken }: MovieListMobileProps) {
  const [releaseFilter, setReleaseFilter] = useState<ReleaseFilter>('all')

  // Filter movies: only keep those with rating or wish data
  const filteredMovies = useMemo(() => filterMoviesWithRatingOrWish(movies), [movies])

  // Filter by release status
  const releaseFilteredMovies = useMemo(() => {
    if (releaseFilter === 'all') {
      return filteredMovies
    }

    return filteredMovies.filter((movie) => {
      const releaseInfo = getReleaseInfo(movie)
      if (!releaseInfo) {
        // If no release date, include in "upcoming" filter, exclude from "released"
        return releaseFilter === 'upcoming'
      }

      if (releaseFilter === 'released') {
        return releaseInfo.isReleased
      } else if (releaseFilter === 'upcoming') {
        return !releaseInfo.isReleased
      }

      return true
    })
  }, [filteredMovies, releaseFilter])

  if (!releaseFilteredMovies || releaseFilteredMovies.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">No movies available</p>
          <p className="mt-2 text-sm text-gray-300">Please try again later</p>
        </div>
        {/* Filter controls for mobile */}
        <div className="w-full max-w-xs px-4">
          <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 shadow-lg ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <label htmlFor="release-filter-select-mobile" className="text-sm font-medium text-white">
                Filter:
              </label>
              <ClearableSelect
                value={releaseFilter}
                placeholder="All"
                onChange={(value) => setReleaseFilter((value || 'all') as ReleaseFilter)}
                options={[
                  { value: 'all', label: 'All Movies' },
                  { value: 'released', label: 'Released' },
                  { value: 'upcoming', label: 'Upcoming' },
                ]}
                clearable={false}
                media={true}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter controls for mobile */}
      <div className="px-4">
        <div className="rounded-lg border border-white/10 bg-white/5 backdrop-blur-md px-4 py-3 shadow-lg ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-300">
              <span className="font-semibold text-white">{releaseFilteredMovies.length}</span> movies
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="release-filter-select-mobile" className="text-sm font-medium text-white">
                Filter:
              </label>
              <ClearableSelect
                value={releaseFilter}
                placeholder="All"
                onChange={(value) => setReleaseFilter((value || 'all') as ReleaseFilter)}
                options={[
                  { value: 'all', label: 'All Movies' },
                  { value: 'released', label: 'Released' },
                  { value: 'upcoming', label: 'Upcoming' },
                ]}
                clearable={false}
                media={true}
              />
            </div>
          </div>
        </div>
      </div>
      <MovieSwipeView movies={releaseFilteredMovies} favoriteAvailable={favoriteAvailable} favoriteIds={favoriteIds} shareToken={shareToken} />
    </div>
  )
}
