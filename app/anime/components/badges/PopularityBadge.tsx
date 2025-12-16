import Tooltip from '@/components/Tooltip'

interface PopularityBadgeProps {
  popularity: number
  variant?: 'dark' | 'light'
}

/**
 * Anime Popularity Badge component
 * Supports dark and light variants
 */
export default function PopularityBadge({ popularity, variant = 'dark' }: PopularityBadgeProps) {
  if (popularity === 0) return null

  if (variant === 'light') {
    return (
      <Tooltip content="AniList Popularity" position="top">
        <span className="flex items-center gap-1 rounded-lg bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">🔥 {popularity.toLocaleString()}</span>
      </Tooltip>
    )
  }

  return (
    <Tooltip content="AniList Popularity" position="top">
      <span className="flex items-center gap-1 rounded-lg bg-pink-500/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-pink-200 border border-pink-400/30">
        🔥 {popularity.toLocaleString()}
      </span>
    </Tooltip>
  )
}
