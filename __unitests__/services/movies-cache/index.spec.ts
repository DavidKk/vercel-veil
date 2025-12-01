import { shouldUpdate } from '@/services/movies-cache'

// Mock Date.now() for time-based tests
describe('services/movies-cache', () => {
  beforeEach(() => {
    jest.useRealTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('shouldUpdate', () => {
    it('should return true when data is older than 8 hours', () => {
      jest.useFakeTimers()
      const now = Date.now()
      jest.setSystemTime(now)

      // Data is 9 hours old
      const oldTimestamp = now - 9 * 60 * 60 * 1000

      const result = shouldUpdate(oldTimestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })

    it('should return false when data is less than 8 hours old and not in update window', () => {
      jest.useFakeTimers()
      // Set to UTC 10:00 (not in update window)
      const mockDate = new Date('2024-01-15T10:00:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data is 5 hours old (also not in update window)
      const recentTimestamp = mockDate.getTime() - 5 * 60 * 60 * 1000

      const result = shouldUpdate(recentTimestamp)

      expect(result).toBe(false)
      jest.useRealTimers()
    })

    it('should return false when both current time and data are in the same update window', () => {
      jest.useFakeTimers()
      // Set to UTC 04:30 (in update window 0)
      const mockDate = new Date('2024-01-15T04:30:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated 30 minutes ago (also in update window 0)
      const recentTimestamp = mockDate.getTime() - 30 * 60 * 1000

      const result = shouldUpdate(recentTimestamp)

      expect(result).toBe(false)
      jest.useRealTimers()
    })

    it('should return true when current time and data are in different update windows', () => {
      jest.useFakeTimers()
      // Set to UTC 12:30 (in update window 1)
      const mockDate = new Date('2024-01-15T12:30:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated in update window 0 (UTC 04:30, 8 hours ago)
      const oldTimestamp = new Date('2024-01-15T04:30:00Z').getTime()

      const result = shouldUpdate(oldTimestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })

    it('should return true when current time is in update window but data was not', () => {
      jest.useFakeTimers()
      // Set to UTC 04:30 (in update window 0)
      const mockDate = new Date('2024-01-15T04:30:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated at UTC 10:00 (not in any update window)
      const timestamp = new Date('2024-01-15T10:00:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })

    it('should return false when current time is not in update window', () => {
      jest.useFakeTimers()
      // Set to UTC 10:00 (not in update window)
      const mockDate = new Date('2024-01-15T10:00:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated at UTC 04:30 (in update window 0, 5.5 hours ago)
      const timestamp = new Date('2024-01-15T04:30:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(false)
      jest.useRealTimers()
    })

    it('should return true when crossing from window 2 to window 0 (next day)', () => {
      jest.useFakeTimers()
      // Set to UTC 04:30 (window 0, next day)
      const mockDate = new Date('2024-01-16T04:30:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated in window 2 (previous day, UTC 20:30)
      const timestamp = new Date('2024-01-15T20:30:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })

    it('should return true when crossing from window 0 to window 1', () => {
      jest.useFakeTimers()
      // Set to UTC 12:30 (window 1)
      const mockDate = new Date('2024-01-15T12:30:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated in window 0 (UTC 04:30, same day)
      const timestamp = new Date('2024-01-15T04:30:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })

    it('should return true when crossing from window 1 to window 2', () => {
      jest.useFakeTimers()
      // Set to UTC 20:30 (window 2)
      const mockDate = new Date('2024-01-15T20:30:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated in window 1 (UTC 12:30, same day)
      const timestamp = new Date('2024-01-15T12:30:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })

    it('should handle edge case: data updated at start of update window, current at end of same window', () => {
      jest.useFakeTimers()
      // Set to UTC 04:59 (end of update window 0)
      const mockDate = new Date('2024-01-15T04:59:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated at UTC 04:00 (start of same window)
      const timestamp = new Date('2024-01-15T04:00:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(false)
      jest.useRealTimers()
    })

    it('should handle edge case: data updated at end of window, current at start of next window', () => {
      jest.useFakeTimers()
      // Set to UTC 12:00 (start of update window 1)
      const mockDate = new Date('2024-01-15T12:00:00Z')
      jest.setSystemTime(mockDate.getTime())

      // Data was updated at UTC 04:59 (end of previous window 0)
      const timestamp = new Date('2024-01-15T04:59:00Z').getTime()

      const result = shouldUpdate(timestamp)

      expect(result).toBe(true)
      jest.useRealTimers()
    })
  })
})
