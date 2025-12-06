interface MaoyanBadgeProps {
  url: string
}

/**
 * 猫眼 Badge 组件
 * 移动端和PC端使用不同的尺寸
 */
export default function MaoyanBadge({ url }: MaoyanBadgeProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-lg bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all hover:from-orange-700 hover:to-red-700 active:scale-95"
    >
      猫眼
    </a>
  )
}
