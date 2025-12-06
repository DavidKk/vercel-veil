interface TMDBBadgeProps {
  url: string
}

/**
 * TMDB Badge 组件
 * 移动端和PC端使用不同的尺寸
 */
export default function TMDBBadge({ url }: TMDBBadgeProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-indigo-700 hover:to-purple-700 active:scale-95"
    >
      TMDB
    </a>
  )
}
