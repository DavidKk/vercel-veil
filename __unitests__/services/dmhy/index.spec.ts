// Mock logger first
jest.mock('@/services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  fail: jest.fn(),
}))

// Mock fetchWithCache
jest.mock('@/services/fetch', () => ({
  fetchWithCache: jest.fn(),
}))

import { clearDMHYCache, getDMHYRSSData, searchByEpisode, searchByQuery } from '@/services/dmhy'
import { DMHY_RSS_BASE_URL } from '@/services/dmhy/constants'
import { fetchWithCache } from '@/services/fetch'

describe('services/dmhy', () => {
  const mockKeyword = 'One Piece'

  const mockRSSXML = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>動漫花園資源網</title>
    <link>http://share.dmhy.org</link>
    <item>
      <title><![CDATA[[Skymoon-Raws][One Piece 海賊王][1151][ViuTV][WEB-RIP][CHT][SRT][1080p][MKV]]]></title>
      <link>http://share.dmhy.org/topics/view/708404.html</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid isPermaLink="true">http://share.dmhy.org/topics/view/708404.html</guid>
      <enclosure url="magnet:?xt=urn:btih:VWUQCTXPJURJCSQLAIVQNTFBHTTQJBR3" length="1234567890" type="application/x-bittorrent"></enclosure>
      <author>Laputa</author>
      <category>動畫</category>
    </item>
    <item>
      <title><![CDATA[[Other][Not One Piece][100][WEB-RIP][1080p]]]></title>
      <link>http://share.dmhy.org/topics/view/708405.html</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid isPermaLink="true">http://share.dmhy.org/topics/view/708405.html</guid>
      <enclosure url="magnet:?xt=urn:btih:OTHERHASH" length="987654321" type="application/x-bittorrent"></enclosure>
    </item>
    <item>
      <title><![CDATA[[Skymoon-Raws][One Piece 海賊王][1152][ViuTV][WEB-RIP][CHT][SRT][1080p][MKV]]]></title>
      <link>http://share.dmhy.org/topics/view/708406.html</link>
      <pubDate>Wed, 03 Dec 2025 03:00:00 +0800</pubDate>
      <guid isPermaLink="true">http://share.dmhy.org/topics/view/708406.html</guid>
      <enclosure url="magnet:?xt=urn:btih:ANOTHERHASH" length="2345678901" type="application/x-bittorrent"></enclosure>
    </item>
  </channel>
</rss>`

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
    clearDMHYCache() // Clear cache before each test
    ;(fetchWithCache as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getDMHYRSSData', () => {
    it('should fetch and parse RSS feed correctly', async () => {
      // Convert XML string to ArrayBuffer
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await getDMHYRSSData(mockKeyword)

      const expectedUrl = `${DMHY_RSS_BASE_URL}?keyword=${encodeURIComponent(mockKeyword).replace(/%20/g, '+')}`
      expect(fetchWithCache).toHaveBeenCalledWith(expectedUrl, {
        method: 'GET',
        headers: {
          accept: 'application/xhtml+xml,application/xml;',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        },
        cacheDuration: 60 * 1000,
      })

      expect(result).toHaveLength(3) // All items (no filtering)
      expect(result[0].episode).toBe(1151)
      expect(result[0].title).toContain('One Piece')
      expect(result[0].magnet).toBe('magnet:?xt=urn:btih:VWUQCTXPJURJCSQLAIVQNTFBHTTQJBR3')
      expect(result[0].size).toBe(1234567890)
      // Item 2 has [100] in title, which will be extracted as episode 100
      expect(result[1].episode).toBe(100)
      expect(result[2].episode).toBe(1152)
    })

    it('should return all items (no filtering)', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await getDMHYRSSData(mockKeyword)

      // Should return all items (3 items)
      expect(result).toHaveLength(3)
    })

    it('should extract episode number from title', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await getDMHYRSSData(mockKeyword)

      expect(result[0].episode).toBe(1151)
      // Item 2 has [100] in title, which will be extracted as episode 100
      expect(result[1].episode).toBe(100)
      expect(result[2].episode).toBe(1152)
    })

    it('should use base URL when keyword is not provided', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      await getDMHYRSSData()

      expect(fetchWithCache).toHaveBeenCalledWith(DMHY_RSS_BASE_URL, expect.any(Object))
    })

    it('should handle fetch errors gracefully', async () => {
      ;(fetchWithCache as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const result = await getDMHYRSSData(mockKeyword)

      expect(result).toEqual([])
    })

    it('should handle HTTP errors', async () => {
      ;(fetchWithCache as jest.Mock).mockRejectedValueOnce(new Error('HTTP error! Status: 404'))

      await expect(getDMHYRSSData(mockKeyword)).rejects.toThrow('HTTP error! Status: 404')
    })

    it('should cache RSS data by keyword', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValue(buffer)

      // First call
      const result1 = await getDMHYRSSData(mockKeyword)
      expect(fetchWithCache).toHaveBeenCalledTimes(1)

      // Second call should use DMHY cache (not fetchWithCache)
      const result2 = await getDMHYRSSData(mockKeyword)
      expect(fetchWithCache).toHaveBeenCalledTimes(1) // Still 1, DMHY cache is used
      expect(result2).toEqual(result1)
    })

    it('should cache different keywords separately', async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer).mockResolvedValueOnce(buffer)

      // First keyword
      await getDMHYRSSData('One Piece')
      expect(fetchWithCache).toHaveBeenCalledTimes(1)

      // Different keyword should fetch again
      await getDMHYRSSData('Naruto')
      expect(fetchWithCache).toHaveBeenCalledTimes(2)
    })

    it('should update cache when expired', async () => {
      jest.useFakeTimers()
      const now = Date.now()
      jest.setSystemTime(now)
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer

      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer).mockResolvedValueOnce(buffer)

      // First call
      await getDMHYRSSData(mockKeyword)
      expect(fetchWithCache).toHaveBeenCalledTimes(1)

      // Move time forward by 8 days (more than 7 days cache duration)
      const futureTime = now + 8 * 24 * 60 * 60 * 1000
      jest.setSystemTime(futureTime)

      // Should fetch again when cache expired
      await getDMHYRSSData(mockKeyword)
      expect(fetchWithCache).toHaveBeenCalledTimes(2)

      jest.useRealTimers()
    })
  })

  describe('searchByEpisode', () => {
    beforeEach(async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer
      ;(fetchWithCache as jest.Mock).mockResolvedValue(buffer)
    })

    it('should search items by episode number from cached results', async () => {
      const result = await searchByEpisode(mockKeyword, 1151)

      expect(result).toHaveLength(1)
      expect(result[0].episode).toBe(1151)
      expect(result[0].title).toContain('1151')
    })

    it('should return empty array when episode not found', async () => {
      const result = await searchByEpisode(mockKeyword, 9999)

      expect(result).toEqual([])
    })

    it('should return multiple items if same episode exists', async () => {
      const multiEpisodeXML = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[[Group1][One Piece][1151][1080p]]]></title>
      <link>http://example.com/1</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid>1</guid>
      <enclosure url="magnet:?xt=urn:btih:HASH1" type="application/x-bittorrent"></enclosure>
    </item>
    <item>
      <title><![CDATA[[Group2][One Piece][1151][720p]]]></title>
      <link>http://example.com/2</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid>2</guid>
      <enclosure url="magnet:?xt=urn:btih:HASH2" type="application/x-bittorrent"></enclosure>
    </item>
  </channel>
</rss>`

      // Clear cache first
      ;(fetchWithCache as jest.Mock).mockClear()
      const encoder = new TextEncoder()
      const buffer = encoder.encode(multiEpisodeXML).buffer
      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await searchByEpisode(mockKeyword, 1151)

      expect(result).toHaveLength(2)
      expect(result.every((item) => item.episode === 1151)).toBe(true)
    })
  })

  describe('searchByQuery', () => {
    beforeEach(async () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode(mockRSSXML).buffer
      ;(fetchWithCache as jest.Mock).mockResolvedValue(buffer)
    })

    it('should search items by keyword', async () => {
      const result = await searchByQuery(mockKeyword)

      // Should return all items matching the keyword from DMHY RSS
      expect(result.length).toBeGreaterThan(0)
    })

    it('should use keyword to build RSS URL', async () => {
      await searchByQuery('Naruto')

      const expectedUrl = `${DMHY_RSS_BASE_URL}?keyword=${encodeURIComponent('Naruto').replace(/%20/g, '+')}`
      expect(fetchWithCache).toHaveBeenCalledWith(expectedUrl, expect.any(Object))
    })
  })

  describe('Episode number extraction', () => {
    it('should extract episode from [1151] format', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[[Group][One Piece][1151][1080p]]]></title>
      <link>http://example.com</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid>1</guid>
      <enclosure url="magnet:?xt=urn:btih:HASH" type="application/x-bittorrent"></enclosure>
    </item>
  </channel>
</rss>`

      const encoder = new TextEncoder()
      const buffer = encoder.encode(xml).buffer
      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await getDMHYRSSData(mockKeyword)

      expect(result[0].episode).toBe(1151)
    })

    it('should extract episode from 第1151話 format', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[[Group][One Piece]第1151話[1080p]]]></title>
      <link>http://example.com</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid>1</guid>
      <enclosure url="magnet:?xt=urn:btih:HASH" type="application/x-bittorrent"></enclosure>
    </item>
  </channel>
</rss>`

      const encoder = new TextEncoder()
      const buffer = encoder.encode(xml).buffer
      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await getDMHYRSSData(mockKeyword)

      expect(result[0].episode).toBe(1151)
    })

    it('should return null episode when episode number cannot be extracted', async () => {
      const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title><![CDATA[[Group][Anime Title Without Episode][1080p]]]></title>
      <link>http://example.com</link>
      <pubDate>Wed, 03 Dec 2025 02:47:31 +0800</pubDate>
      <guid>1</guid>
      <enclosure url="magnet:?xt=urn:btih:HASH" type="application/x-bittorrent"></enclosure>
    </item>
  </channel>
</rss>`

      // Clear cache first
      ;(fetchWithCache as jest.Mock).mockClear()
      const encoder = new TextEncoder()
      const buffer = encoder.encode(xml).buffer
      ;(fetchWithCache as jest.Mock).mockResolvedValueOnce(buffer)

      const result = await getDMHYRSSData('Anime Title Without Episode')

      expect(result[0].episode).toBeNull()
    })
  })
})
