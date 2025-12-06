import AnimeBadge from './AnimeBadge'

interface AnimeYearBadgeProps {
  year: number
  tooltip?: string
  variant?: 'dark' | 'light'
}

/**
 * Anime 年份 Badge 组件
 * 支持深色和浅色两种变体
 */
export default function AnimeYearBadge({ year, tooltip = 'Start Year', variant = 'light' }: AnimeYearBadgeProps) {
  return (
    <AnimeBadge tooltip={tooltip} variant={variant}>
      {year}
    </AnimeBadge>
  )
}
