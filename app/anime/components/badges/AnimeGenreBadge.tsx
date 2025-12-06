interface AnimeGenreBadgeProps {
  genre: string
  variant?: 'dark' | 'light'
}

/**
 * Anime 类型 Badge 组件
 * 支持深色和浅色两种变体
 */
export default function AnimeGenreBadge({ genre, variant = 'light' }: AnimeGenreBadgeProps) {
  if (variant === 'dark') {
    return <span className="rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white border border-white/20">{genre}</span>
  }
  return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">{genre}</span>
}
