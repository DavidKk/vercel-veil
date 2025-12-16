import { Star } from 'feather-icons-react'

import Tooltip from '@/components/Tooltip'

interface AnimeScoreBadgeProps {
  score: number
  variant?: 'dark' | 'light'
}

/**
 * Anime Score Badge component
 * Supports dark and light variants
 */
export default function AnimeScoreBadge({ score, variant = 'dark' }: AnimeScoreBadgeProps) {
  const formattedScore = (score / 10).toFixed(1)

  if (variant === 'light') {
    return (
      <Tooltip content="AniList Average Score" position="top">
        <span className="flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
          <Star size={12} className="fill-yellow-500 text-yellow-500" />
          {formattedScore}
        </span>
      </Tooltip>
    )
  }

  return (
    <Tooltip content="AniList Average Score" position="top">
      <span className="flex items-center gap-1 rounded-lg bg-yellow-500/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-yellow-200 border border-yellow-400/30">
        <Star size={12} className="fill-yellow-400 text-yellow-400" />
        <span>{formattedScore}</span>
      </span>
    </Tooltip>
  )
}
