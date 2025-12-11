import Tooltip from '@/components/Tooltip'

interface BadgeProps {
  children: React.ReactNode
  tooltip?: string
  className?: string
}

/**
 * Common Badge component
 * Uses different sizes for mobile and desktop
 */
export default function Badge({ children, tooltip, className = '' }: BadgeProps) {
  const baseClasses = 'rounded-lg bg-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white border border-white/20'
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
