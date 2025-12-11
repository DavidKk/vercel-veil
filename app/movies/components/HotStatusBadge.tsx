'use client'

import { FireIcon, StarIcon } from '@heroicons/react/24/solid'

import Tooltip from '@/components/Tooltip'
import type { MergedMovie } from '@/services/maoyan/types'
import { judgeMovieHotStatus } from '@/services/movies/popularity'
import { MovieHotStatus } from '@/services/movies/popularity/types'

interface HotStatusBadgeProps {
  movie: MergedMovie
}

/**
 * Get hot status display configuration
 */
function getHotStatusConfig(status: MovieHotStatus) {
  switch (status) {
    case MovieHotStatus.HIGHLY_ANTICIPATED:
      return {
        icon: StarIcon,
        iconColor: 'text-yellow-400',
        text: 'Highly Anticipated',
        description: 'Highly anticipated movie with high popularity before release',
      }
    case MovieHotStatus.VERY_HOT:
      return {
        icon: FireIcon,
        iconColor: 'text-red-500',
        text: 'Very Hot',
        description: 'Very hot movie with high popularity and good ratings',
      }
    case MovieHotStatus.AVERAGE:
      return {
        icon: null,
        iconColor: '',
        text: '',
        description: '',
      }
    case MovieHotStatus.NICHE:
      return {
        icon: null,
        iconColor: '',
        text: '',
        description: '',
      }
    default:
      return {
        icon: null,
        iconColor: '',
        text: '',
        description: '',
      }
  }
}

export default function HotStatusBadge({ movie }: HotStatusBadgeProps) {
  const status = judgeMovieHotStatus(movie)
  const config = getHotStatusConfig(status)

  // Don't show badge for average or niche movies
  if (!config.icon) {
    return null
  }

  const Icon = config.icon

  return (
    <Tooltip content={config.description} position="left">
      <div className="absolute right-2 top-2 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm border border-white/20 p-1.5 shadow-lg">
        <Icon className={`h-4 w-4 ${config.iconColor} drop-shadow-md`} />
      </div>
    </Tooltip>
  )
}
