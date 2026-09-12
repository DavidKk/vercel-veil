/** HTTP headers for Qishui music requests */
export const QISHUI_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

/** CSS selector for playlist element in Qishui music HTML (legacy DOM fallback) */
export const QISHUI_PLAYLIST_SELECTOR = '#root > div > div > div > div > div:nth-child(2)'

/** Marker for Modern.js router data embedded in Qishui share pages */
export const QISHUI_ROUTER_DATA_MARKER = '_ROUTER_DATA'
