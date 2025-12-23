import Tooltip from '@/components/Tooltip'

interface EpisodesBadgeProps {
  episodes: number
  variant?: 'dark' | 'light'
}

/**
 * Anime Episodes Badge component
 * Supports dark and light variants
 */
export default function EpisodesBadge({ episodes, variant = 'dark' }: EpisodesBadgeProps) {
  if (variant === 'light') {
    return (
      <Tooltip content="Total Episodes" position="top">
        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{episodes} eps</span>
      </Tooltip>
    )
  }

  return (
    <Tooltip content="Total Episodes" position="top">
      <span className="rounded-lg bg-blue-500/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-blue-200 border border-blue-400/30">{episodes} eps</span>
    </Tooltip>
  )
}
