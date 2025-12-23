import AnimeBadge from './AnimeBadge'

interface AnimeYearBadgeProps {
  year: number
  tooltip?: string
  variant?: 'dark' | 'light'
}

/**
 * Anime Year Badge component
 * Supports dark and light variants
 */
export default function AnimeYearBadge({ year, tooltip = 'Start Year', variant = 'light' }: AnimeYearBadgeProps) {
  return (
    <AnimeBadge tooltip={tooltip} variant={variant}>
      {year}
    </AnimeBadge>
  )
}
