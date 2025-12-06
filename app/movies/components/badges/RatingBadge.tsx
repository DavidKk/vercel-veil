import { Star } from 'feather-icons-react'

import Tooltip from '@/components/Tooltip'

interface RatingBadgeProps {
  rating?: number
  score?: string
}

/**
 * 评分 Badge 组件
 * 移动端和PC端使用不同的尺寸
 */
export default function RatingBadge({ rating, score }: RatingBadgeProps) {
  if (!rating && !score) return null

  const displayValue = rating ? rating.toFixed(1) : score
  const tooltip = rating ? 'TMDB Rating' : 'Maoyan Score'

  return (
    <Tooltip content={tooltip} position="top">
      <span className="flex items-center gap-1 rounded-lg bg-yellow-500/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-yellow-200 border border-yellow-400/30">
        <Star size={12} className="fill-yellow-400 text-yellow-400" />
        <span>{displayValue}</span>
      </span>
    </Tooltip>
  )
}
