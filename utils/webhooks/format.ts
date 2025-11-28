export function formatEpisodeCode(season?: number, episode?: number) {
  const seasonLabel = Number.isFinite(season) ? `S${String(season).padStart(2, '0')}` : 'S??'
  const episodeLabel = Number.isFinite(episode) ? `E${String(episode).padStart(2, '0')}` : 'E??'
  return `${seasonLabel}${episodeLabel}`
}

export function escapeHtml(value?: string | number | null) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value).replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;'
      case '<':
        return '&lt;'
      case '>':
        return '&gt;'
      case '"':
        return '&quot;'
      case "'":
        return '&#39;'
      default:
        return char
    }
  })
}

export function formatFileSize(size?: number) {
  if (!Number.isFinite(size)) {
    return ''
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = size as number
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`
}
