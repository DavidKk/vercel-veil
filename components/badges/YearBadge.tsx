import Badge from './Badge'

interface YearBadgeProps {
  year: number
  tooltip?: string
}

/**
 * 年份 Badge 组件
 */
export default function YearBadge({ year, tooltip = 'Release Year' }: YearBadgeProps) {
  return <Badge tooltip={tooltip}>{year}</Badge>
}
