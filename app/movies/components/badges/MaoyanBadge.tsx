interface MaoyanBadgeProps {
  url: string
}

/**
 * Maoyan Badge component
 * Uses different sizes for mobile and desktop
 */
export default function MaoyanBadge({ url }: MaoyanBadgeProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-orange-700 hover:to-red-700 active:scale-95"
    >
      Maoyan
    </a>
  )
}
