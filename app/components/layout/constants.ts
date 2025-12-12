/**
 * Layout configuration
 * Unified management of Nav and Footer configuration
 */

/**
 * Route prefixes that should hide global Nav and Footer
 * If the current path starts with these prefixes, Nav and Footer will not be displayed
 */
export const HIDDEN_ROUTES = ['/movies', '/anime']

/**
 * Default navigation configuration
 */
export const DEFAULT_NAV = {
  notification: [{ name: 'Email', href: '/email' }],
  feed: [
    { name: 'Douban', href: '/feed/douban' },
    { name: 'Qishui', href: '/feed/qishui' },
  ],
  media: [
    { name: 'Movies', href: '/movies' },
    { name: 'Anime', href: '/anime' },
  ],
  private: [
    { name: 'Music', href: '/music' },
    { name: 'Sync', href: '/sync' },
  ],
}
