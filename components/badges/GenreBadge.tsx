interface GenreBadgeProps {
  genre: string
  variant?: 'dark' | 'light'
}

/**
 * Genre Badge component
 * Supports dark and light variants
 */
export default function GenreBadge({ genre, variant = 'dark' }: GenreBadgeProps) {
  if (variant === 'light') {
    return <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{genre}</span>
  }
  return <span className="rounded-full bg-indigo-500/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-indigo-200 border border-indigo-400/30">{genre}</span>
}
