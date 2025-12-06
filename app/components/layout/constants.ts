/**
 * 布局配置
 * 统一管理 Nav 和 Footer 的配置
 */

/**
 * 配置需要隐藏全局 Nav 和 Footer 的路由前缀
 * 如果当前路径以这些前缀开头，Nav 和 Footer 将不会显示
 */
export const HIDDEN_ROUTES = ['/movies', '/anime']

/**
 * 默认导航配置
 */
export const DEFAULT_NAV = {
  notification: [{ name: 'Email', href: '/email' }],
  feed: [{ name: 'Douban', href: '/feed/douban' }],
  media: [
    { name: 'Movies', href: '/movies' },
    { name: 'Anime', href: '/anime' },
  ],
  private: [
    { name: 'Music', href: '/music' },
    { name: 'Sync', href: '/sync' },
  ],
}
