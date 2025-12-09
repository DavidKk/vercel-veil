/**
 * Hardcoded DMHY RSS URL
 */
export const DMHY_RSS_BASE_URL = atob('aHR0cHM6Ly9kbWh5Lm9yZy90b3BpY3MvcnNzL3Jzcy54bWw=')

/**
 * RSS headers for DMHY requests
 */
export const RSS_HEADERS = {
  accept: 'application/xhtml+xml,application/xml;',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
} as const

/**
 * Cache duration constants
 */
export const DMHY_CACHE = {
  /** Cache duration: 7 days (1 week) */
  DURATION: 7 * 24 * 60 * 60 * 1000,
} as const

/**
 * Episode number regex patterns
 */
export const EPISODE_PATTERNS = [
  /\((\d+)\)/g, // (1151)
  /\[(\d+)\]/g, // [1151]
  /第(\d+)話/g, // 第1151話
  /第(\d+)话/g, // 第1151话
  /(\d+)/g, // 1151 (fallback, match last number)
] as const
