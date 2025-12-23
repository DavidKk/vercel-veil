import { Heart } from 'feather-icons-react'

import Tooltip from '@/components/Tooltip'

interface WishBadgeProps {
  wish?: number
  tmdbVoteCount?: number
}

/**
 * Wish/Vote Count Badge component
 */
export default function WishBadge({ wish = 0, tmdbVoteCount = 0 }: WishBadgeProps) {
  const displayCount = Math.max(wish, tmdbVoteCount)
  const source = tmdbVoteCount > wish ? 'TMDB Vote Count' : 'Maoyan Wish Count'

  if (displayCount === 0) return null

  return (
    <Tooltip content={source} position="top">
      <span className="flex items-center gap-1 rounded-lg bg-pink-500/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-pink-200 border border-pink-400/30">
        <Heart size={12} className="fill-pink-400 text-pink-400" />
        <span>{displayCount.toLocaleString()}</span>
      </span>
    </Tooltip>
  )
}
