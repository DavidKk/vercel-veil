import { create } from 'xmlbuilder2'

import { NEWZNAB_MIME_TYPE } from './constants'
import type { NewznabCapabilities, NewznabChannelMetadata, NewznabItem } from './types'

/**
 * Newznab XML namespaces
 */
const NEWZNAB_NAMESPACES = {
  atom: 'http://www.w3.org/2005/Atom',
  newznab: 'http://www.newznab.com/DTD/2010/feeds/attributes/',
} as const

/**
 * Generate Newznab RSS XML response
 * @param items Array of Newznab items
 * @param metadata Channel metadata
 * @returns XML string
 */
export function generateNewznabRSS(items: NewznabItem[], metadata: NewznabChannelMetadata, offset = 0): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rss', { version: '2.0' })
    .att('xmlns:atom', NEWZNAB_NAMESPACES.atom)
    .att('xmlns:newznab', NEWZNAB_NAMESPACES.newznab)

  const channel = root.ele('channel')
  channel.ele('title').txt(metadata.title)
  channel.ele('description').txt(metadata.description)
  channel.ele('link').txt(metadata.link)

  // Add Newznab response metadata
  channel.ele('newznab:response', { offset: String(offset), total: String(items.length) })

  if (metadata.language) {
    channel.ele('language').txt(metadata.language)
  }

  if (metadata.webMaster) {
    channel.ele('webMaster').txt(metadata.webMaster)
  }

  if (metadata.category) {
    channel.ele('category').txt(metadata.category)
  }

  if (metadata.image) {
    const image = channel.ele('image')
    image.att('url', metadata.image.url)
    image.att('title', metadata.image.title)
    image.att('link', metadata.image.link)
    if (metadata.image.description) {
      image.att('description', metadata.image.description)
    }
  }

  if (metadata.atomLink) {
    const atomLink = channel.ele('atom:link')
    atomLink.att('href', metadata.atomLink.href)
    if (metadata.atomLink.rel) {
      atomLink.att('rel', metadata.atomLink.rel)
    }
    if (metadata.atomLink.type) {
      atomLink.att('type', metadata.atomLink.type)
    }
  }

  // Add items
  for (const item of items) {
    const itemEle = channel.ele('item')

    // Standard RSS fields (in recommended order per spec)
    itemEle.ele('title').dat(item.title)
    itemEle.ele('guid', { isPermaLink: 'true' }).txt(item.guid)
    itemEle.ele('link').dat(item.link)
    itemEle.ele('pubDate').txt(item.pubDate)

    if (item.description) {
      itemEle.ele('description').dat(item.description)
    }

    // Size element (required by Sonarr) - must come before enclosure
    if (item.size) {
      itemEle.ele('size').txt(String(item.size))
    }

    // Enclosure (for torrent/magnet links) - detect MIME type from URL and title
    if (item.enclosure) {
      const mimeType = item.enclosure.type || NEWZNAB_MIME_TYPE
      const enclosureAttrs: Record<string, string> = {
        url: item.enclosure.url,
        type: mimeType,
      }
      if (item.enclosure.length) {
        enclosureAttrs.length = String(item.enclosure.length)
      }
      itemEle.ele('enclosure', enclosureAttrs)
    } else if (item.link) {
      // Fallback: use link as enclosure URL
      const mimeType = NEWZNAB_MIME_TYPE
      itemEle.ele('enclosure', { url: item.link, type: mimeType })
    }

    // Newznab attributes (category, season, episode, series, etc.)
    if (item.attributes && item.attributes.length > 0) {
      for (const attr of item.attributes) {
        itemEle.ele('newznab:attr', { name: attr.name, value: attr.value })
      }
    }
  }

  return root.end({ prettyPrint: true })
}

/**
 * Generate Newznab capabilities XML
 * @param capabilities Capabilities configuration
 * @returns XML string
 */
export function generateNewznabCaps(capabilities: NewznabCapabilities): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' }).ele('caps').att('xmlns:newznab', NEWZNAB_NAMESPACES.newznab)

  // Server info
  root.ele('server', { version: capabilities.server.version, title: capabilities.server.title })

  // Limits
  root.ele('limits', { max: String(capabilities.limits.max), default: String(capabilities.limits.default) })

  // Retention
  if (capabilities.retention) {
    root.ele('retention', { days: String(capabilities.retention.days) })
  }

  // Registration
  if (capabilities.registration) {
    root.ele('registration', {
      available: capabilities.registration.available,
      open: capabilities.registration.open,
    })
  }

  // Searching capabilities
  const searching = root.ele('searching')
  if (capabilities.searching.search) {
    const attrs: Record<string, string> = { available: capabilities.searching.search.available }
    if (capabilities.searching.search.supportedParams) {
      attrs.supportedParams = capabilities.searching.search.supportedParams
    }
    searching.ele('search', attrs)
  }

  if (capabilities.searching.tvSearch) {
    const attrs: Record<string, string> = { available: capabilities.searching.tvSearch.available }
    if (capabilities.searching.tvSearch.supportedParams) {
      attrs.supportedParams = capabilities.searching.tvSearch.supportedParams
    }
    searching.ele('tv-search', attrs)
  }

  if (capabilities.searching.movieSearch) {
    const attrs: Record<string, string> = { available: capabilities.searching.movieSearch.available }
    if (capabilities.searching.movieSearch.supportedParams) {
      attrs.supportedParams = capabilities.searching.movieSearch.supportedParams
    }
    searching.ele('movie-search', attrs)
  }

  if (capabilities.searching.audioSearch) {
    const attrs: Record<string, string> = { available: capabilities.searching.audioSearch.available }
    if (capabilities.searching.audioSearch.supportedParams) {
      attrs.supportedParams = capabilities.searching.audioSearch.supportedParams
    }
    searching.ele('audio-search', attrs)
  }

  // Categories
  const categories = root.ele('categories')
  for (const category of capabilities.categories) {
    const categoryEle = categories.ele('category', { id: category.id, name: category.name })
    if (category.subcats) {
      for (const subcat of category.subcats) {
        categoryEle.ele('subcat', { id: subcat.id, name: subcat.name })
      }
    }
  }

  return root.end({ prettyPrint: true })
}
