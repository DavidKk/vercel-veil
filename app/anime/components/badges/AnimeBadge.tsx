import Tooltip from '@/components/Tooltip'

interface AnimeBadgeProps {
  children: React.ReactNode
  tooltip?: string
  className?: string
  variant?: 'dark' | 'light'
}

/**
 * Anime module specific Badge component
 * Supports dark and light variants
 */
export default function AnimeBadge({ children, tooltip, className = '', variant = 'light' }: AnimeBadgeProps) {
  const baseClasses =
    variant === 'light'
      ? 'rounded-lg bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200'
      : 'rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white border border-white/20'
  const combinedClasses = `${baseClasses} ${className}`

  const badge = <span className={combinedClasses}>{children}</span>

  if (tooltip) {
    return (
      <Tooltip content={tooltip} position="top">
        {badge}
      </Tooltip>
    )
  }

  return badge
}
