import type { NextRequest } from 'next/server'

import { GET } from '@/app/api/indexer/dmhy/route'
import { searchByEpisode } from '@/services/dmhy'

// Mock dependencies
jest.mock('@/services/dmhy', () => ({
  getDMHYRSSData: jest.fn(),
  searchByEpisode: jest.fn(),
  searchByKeyword: jest.fn(),
  searchByQuery: jest.fn(), // For backward compatibility
}))

jest.mock('@/services/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  fail: jest.fn(),
}))

// Mock environment variables
const originalEnv = process.env

describe('app/api/indexer/dmhy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      API_SECRET: 'test-api-secret',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  const createMockRequest = (url: string): NextRequest => {
    return {
      url,
      headers: new Headers(),
    } as NextRequest
  }

  const createMockContext = () => ({
    params: Promise.resolve({}),
  })

  describe('API Key authentication', () => {
    it('should reject requests without API key', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(401)
      expect(text).toContain('API key')
    })

    it('should reject requests with invalid API key', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test&apikey=wrong-key'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(401)
      expect(text).toContain('API key')
    })

    it('should accept requests with valid API key', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      ;(searchByKeyword as jest.Mock).mockResolvedValue([])

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())

      expect(response.status).toBe(200)
    })

    it('should not require API key for caps endpoint', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=caps'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(text).toContain('<caps')
      expect(text).toContain('<searching>')
    })
  })

  describe('Caps endpoint', () => {
    it('should return caps XML', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=caps'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/xml')
      expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(text).toContain('<caps')
      expect(text).toContain('<search available="yes"')
      expect(text).toContain('<tv-search available="yes"')
      expect(text).toContain('<movie-search available="no"')
    })
  })

  describe('Search endpoint', () => {
    it('should return search results', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      const mockItems = [
        {
          title: '[Skymoon-Raws][One Piece 海賊王][1151][ViuTV][WEB-RIP][CHT][SRT][1080p][MKV]',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH1',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          size: 1234567890,
          episode: 1151,
        },
      ]

      ;(searchByKeyword as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=One+Piece&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/xml')
      expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(text).toContain('<rss version="2.0"')
      expect(text).toContain('<item>')
      expect(text).toContain('One Piece')
      expect(text).toContain('magnet:?xt=urn:btih:HASH1')
      expect(searchByKeyword).toHaveBeenCalledWith('One Piece')
    })

    it('should return mock data when query parameter is missing (test request)', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=search&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(text).toContain('<rss')
      expect(text).toContain('<item>') // Test requests return mock data
    })

    it('should handle empty search results', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      ;(searchByKeyword as jest.Mock).mockResolvedValue([])

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=NonExistent&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(text).toContain('<rss')
      expect(text).not.toContain('<item>')
    })

    it('should handle search errors', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      ;(searchByKeyword as jest.Mock).mockRejectedValue(new Error('Search error'))

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toContain('Error processing search')
    })
  })

  describe('TV Search endpoint', () => {
    it('should return TV search results by episode', async () => {
      const mockItems = [
        {
          title: '[Skymoon-Raws][One Piece 海賊王][1151][ViuTV][WEB-RIP][CHT][SRT][1080p][MKV]',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH1',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          size: 1234567890,
          episode: 1151,
        },
      ]

      ;(searchByEpisode as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&season=1&ep=1151&q=One+Piece&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('application/xml')
      expect(text).toContain('<rss version="2.0"')
      expect(text).toContain('<item>')
      expect(text).toContain('1151')
      expect(text).toContain('magnet:?xt=urn:btih:HASH1')
      expect(searchByEpisode).toHaveBeenCalledWith('One Piece', 1151)
    })

    it('should return mock data when no search parameters provided (test request)', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(text).toContain('<rss')
      expect(text).toContain('<item>') // Test requests return mock data
    })

    it('should validate season and ep as numbers', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&season=invalid&ep=1151&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toContain('Invalid')
    })

    it('should build keyword with season (season=1, q=One Piece -> keyword "One Piece S1")', async () => {
      const mockItems = [
        {
          title: '[Skymoon-Raws][One Piece 海賊王][1151][ViuTV][WEB-RIP][CHT][SRT][1080p][MKV]',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH1',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          episode: 1151,
        },
      ]

      ;(searchByEpisode as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&season=1&ep=1151&q=One+Piece&apikey=test-api-secret'
      const req = createMockRequest(url)

      await GET(req, createMockContext())

      // Should call searchByEpisode with keyword "One Piece" and episode 1151 (season is not included in keyword)
      expect(searchByEpisode).toHaveBeenCalledWith('One Piece', 1151)
    })

    it('should handle empty TV search results', async () => {
      ;(searchByEpisode as jest.Mock).mockResolvedValue([])

      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&season=1&ep=9999&q=One+Piece&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(200)
      expect(text).toContain('<rss')
      expect(text).not.toContain('<item>')
    })

    it('should handle TV search errors', async () => {
      ;(searchByEpisode as jest.Mock).mockRejectedValue(new Error('Search error'))

      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&season=1&ep=1151&q=One+Piece&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toContain('Error processing tvsearch')
    })

    it('should use query parameter for keyword search when season/ep not provided', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      const mockItems = [
        {
          title: '[Group][Anime][100][1080p]',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH1',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          episode: 100,
        },
      ]

      ;(searchByKeyword as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=tvsearch&q=Anime&apikey=test-api-secret'
      const req = createMockRequest(url)

      await GET(req, createMockContext())

      expect(searchByKeyword).toHaveBeenCalledWith('Anime')
    })
  })

  describe('XML generation', () => {
    it('should escape XML special characters in magnet links', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      const mockItems = [
        {
          title: 'Test Title',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH&tr=tracker1&tr=tracker2',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          episode: null,
        },
      ]

      ;(searchByKeyword as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      // Should escape & to &amp; in enclosure url attribute
      expect(text).toContain('&amp;')
      // The link element uses CDATA so it can contain &, but enclosure url should be escaped
      expect(text).toContain('magnet:?xt=urn:btih:HASH&amp;tr=')
    })

    it('should include size in XML when available', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      const mockItems = [
        {
          title: 'Test Title',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          size: 1234567890,
          episode: null,
        },
      ]

      ;(searchByKeyword as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(text).toContain('<size>1234567890</size>')
    })

    it('should not include size when not available', async () => {
      const { searchByKeyword } = require('@/services/dmhy')
      const mockItems = [
        {
          title: 'Test Title',
          link: 'http://example.com/1',
          magnet: 'magnet:?xt=urn:btih:HASH',
          pubDate: 'Wed, 03 Dec 2025 02:47:31 +0800',
          guid: 'http://example.com/1',
          episode: null,
        },
      ]

      ;(searchByKeyword as jest.Mock).mockResolvedValue(mockItems)

      const url = 'https://example.com/api/indexer/dmhy?t=search&q=test&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(text).not.toContain('<size>')
    })
  })

  describe('Error handling', () => {
    it('should handle unknown request types', async () => {
      const url = 'https://example.com/api/indexer/dmhy?t=unknown&apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toContain('Unknown request type')
    })

    it('should handle missing request type', async () => {
      const url = 'https://example.com/api/indexer/dmhy?apikey=test-api-secret'
      const req = createMockRequest(url)

      const response = await GET(req, createMockContext())
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(text).toContain('Unknown request type')
    })
  })
})
