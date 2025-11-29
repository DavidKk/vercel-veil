'use client'

import { useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'

interface SyncDoubanToTMDBResult {
  success: boolean
  message: string
  synced: number
  skipped?: number
  failed: number
  total: number
  failedMovies?: Array<{
    title: string
    tmdbId: number | string | undefined
    error: string
  }>
}

export default function DoubanToTMDB() {
  const [url, setUrl] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [result, setResult] = useState<SyncDoubanToTMDBResult | null>(null)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const handleSync = async () => {
    if (!url.trim()) {
      alertRef.current?.show('Please enter a Douban RSS feed URL', { type: 'error' })
      return
    }

    setIsSyncing(true)
    setResult(null)

    try {
      // Call the webhook API directly
      const response = await fetch('/api/webhooks/sync/douban-to-tmdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ url: url.trim() }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `Sync failed: ${response.status} ${response.statusText}`
        try {
          const errorJson = JSON.parse(errorText)
          errorMessage = errorJson.message || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const responseData = (await response.json()) as { code: number; message: string; data: SyncDoubanToTMDBResult }
      const syncResult = responseData.data || (responseData as unknown as SyncDoubanToTMDBResult)

      // Ensure success field is set based on response code
      if (!syncResult.success) {
        syncResult.success = responseData.code === 0
      }

      setResult(syncResult)

      if (syncResult.success) {
        alertRef.current?.show(syncResult.message, { type: 'success' })
      } else {
        alertRef.current?.show(syncResult.message, { type: 'error' })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed'
      alertRef.current?.show(errorMessage, { type: 'error' })
      setResult({
        success: false,
        message: errorMessage,
        synced: 0,
        failed: 0,
        total: 0,
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="p-6">
      {/* Input Form */}
      <div className="mb-6">
        <label htmlFor="douban-url" className="mb-2 block text-sm font-medium text-gray-700">
          Douban RSS Feed URL
        </label>
        <input
          id="douban-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.douban.com/feed/people/xxx/interests"
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          disabled={isSyncing}
        />
        <p className="mt-2 text-xs text-gray-500">Example: https://www.douban.com/feed/people/your_username/interests</p>
      </div>

      <button
        onClick={handleSync}
        disabled={isSyncing || !url.trim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSyncing ? 'Syncing...' : 'Sync to TMDB Favorites'}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Sync Results</h2>

          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm font-medium text-gray-600">Total Movies</div>
              <div className="mt-1 text-2xl font-bold text-gray-900">{result.total}</div>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-sm font-medium text-green-600">Synced</div>
              <div className="mt-1 text-2xl font-bold text-green-700">{result.synced}</div>
            </div>
            {result.skipped !== undefined && result.skipped > 0 && (
              <div className="rounded-lg bg-blue-50 p-4">
                <div className="text-sm font-medium text-blue-600">Skipped</div>
                <div className="mt-1 text-2xl font-bold text-blue-700">{result.skipped}</div>
              </div>
            )}
            <div className="rounded-lg bg-red-50 p-4">
              <div className="text-sm font-medium text-red-600">Failed</div>
              <div className="mt-1 text-2xl font-bold text-red-700">{result.failed}</div>
            </div>
          </div>

          <div className="mb-4">
            <div className={`rounded-lg p-3 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <div className="text-sm font-medium">{result.message}</div>
            </div>
          </div>

          {result.failedMovies && result.failedMovies.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-700">Failed Movies</h3>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {result.failedMovies.map((movie, index) => (
                  <div key={index} className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="text-sm font-medium text-red-900">{movie.title}</div>
                    {movie.tmdbId && <div className="text-xs text-red-700">TMDB ID: {movie.tmdbId}</div>}
                    <div className="mt-1 text-xs text-red-600">{movie.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Alert ref={alertRef} />
    </div>
  )
}
