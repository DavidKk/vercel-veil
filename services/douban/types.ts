export interface DoubanItem {
  title: string
  link: string
  description: string
  pubDate: string
  guid: string
}

export interface DoubanRSSChannel {
  title: string
  link: string
  description: string
  language: string
  copyright: string
  pubDate: string
  item: DoubanItem[]
}

export interface DoubanRSS {
  channel: DoubanRSSChannel
}

export interface DoubanRSSDTO {
  rss: DoubanRSS
}
