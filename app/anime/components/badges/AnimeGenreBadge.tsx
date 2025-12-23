interface AnimeGenreBadgeProps {
  genre: string
  variant?: 'dark' | 'light'
}

/**
 * Genre translation map (English to Chinese)
 */
const genreTranslationMap: Record<string, string> = {
  Action: '动作',
  Adventure: '冒险',
  Comedy: '喜剧',
  Drama: '剧情',
  Ecchi: '色情',
  Fantasy: '奇幻',
  Horror: '恐怖',
  'Mahou Shoujo': '魔法少女',
  Mecha: '机甲',
  Music: '音乐',
  Mystery: '悬疑',
  Psychological: '心理',
  Romance: '恋爱',
  'Sci-Fi': '科幻',
  'Slice of Life': '日常',
  Sports: '运动',
  Supernatural: '超自然',
  Thriller: '惊悚',
  School: '校园',
  Shounen: '少年',
  Shoujo: '少女',
  Seinen: '青年',
  Josei: '女性',
  Harem: '后宫',
  Isekai: '异世界',
}

/**
 * Translate genre from English to Chinese
 */
function translateGenre(genre: string): string {
  return genreTranslationMap[genre] || genre
}

/**
 * Anime Genre Badge component
 * Supports dark and light variants
 * Automatically translates English genres to Chinese
 */
export default function AnimeGenreBadge({ genre, variant = 'light' }: AnimeGenreBadgeProps) {
  const translatedGenre = translateGenre(genre)

  if (variant === 'dark') {
    return <span className="rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-medium text-white border border-white/20">{translatedGenre}</span>
  }
  return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 border border-purple-200">{translatedGenre}</span>
}
