interface TMDBBadgeProps {
  url?: string
}

/**
 * TMDB Badge component for anime
 * Anime style: pink to purple gradient (different from movie style)
 */
export default function TMDBBadge({ url }: TMDBBadgeProps) {
  if (!url) {
    return null
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-pink-600 hover:to-purple-600 active:scale-95"
      onClick={(e) => e.stopPropagation()}
    >
      TMDB
    </a>
  )
}
