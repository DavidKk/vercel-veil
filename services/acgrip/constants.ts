/**
 * Hardcoded ACG.RIP RSS URL
 */
export const ACGRIP_RSS_BASE_URL = atob('aHR0cHM6Ly9hY2cucmlwLy54bWw=')

/**
 * RSS headers for ACG.RIP requests
 */
export const RSS_HEADERS = {
  accept: 'application/xhtml+xml,application/xml;',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
} as const

/**
 * Episode number regex patterns for ACG.RIP
 * Title format: [Group] Title / English Title - 1152 (Quality)
 * or: [Group] Title / English Title - EP 1152 (Quality)
 * or: [Group] Title / English Title - SP21 (Quality)
 */
export const EPISODE_PATTERNS = [
  /- EP (\d+)/gi, // - EP 1152
  /- SP(\d+)/gi, // - SP21
  /- (\d+) \(/g, // - 1152 (
  /- (\d+)(?:\s|$)/g, // - 1152 (followed by space or end)
  /(\d+)/g, // 1152 (fallback, match last number)
] as const
