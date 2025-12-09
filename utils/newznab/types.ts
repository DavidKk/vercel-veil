/**
 * Newznab API types and interfaces
 */

/**
 * Newznab RSS item structure
 */
export interface NewznabItem {
  title: string
  link: string
  guid: string
  pubDate: string
  description?: string
  category?: string
  enclosure?: {
    url: string
    length?: number
    type?: string
  }
  size?: number
  attributes?: Array<{
    name: string
    value: string
  }>
}

/**
 * Newznab RSS channel metadata
 */
export interface NewznabChannelMetadata {
  title: string
  description: string
  link: string
  language?: string
  webMaster?: string
  category?: string
  image?: {
    url: string
    title: string
    link: string
    description?: string
  }
  atomLink?: {
    href: string
    rel?: string
    type?: string
  }
}

/**
 * Newznab capabilities configuration
 */
export interface NewznabCapabilities {
  server: {
    version: string
    title: string
  }
  limits: {
    max: number
    default: number
  }
  retention?: {
    days: number
  }
  registration?: {
    available: 'yes' | 'no'
    open: 'yes' | 'no'
  }
  searching: {
    search?: {
      available: 'yes' | 'no'
      supportedParams?: string
    }
    tvSearch?: {
      available: 'yes' | 'no'
      supportedParams?: string
    }
    movieSearch?: {
      available: 'yes' | 'no'
      supportedParams?: string
    }
    audioSearch?: {
      available: 'yes' | 'no'
      supportedParams?: string
    }
  }
  categories: Array<{
    id: string
    name: string
    subcats?: Array<{
      id: string
      name: string
    }>
  }>
}
