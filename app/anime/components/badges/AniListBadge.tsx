interface AniListBadgeProps {
  url: string
}

/**
 * AniList Badge component
 * Uses different sizes for mobile and desktop
 */
export default function AniListBadge({ url }: AniListBadgeProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
    >
      AniList
    </a>
  )
}
