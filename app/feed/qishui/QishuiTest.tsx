'use client'

import { useRequest } from 'ahooks'
import { Check, Copy, FileText, Info, Music, X } from 'feather-icons-react'
import { useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'
import { Spinner } from '@/components/Spinner'

import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'

interface TestResult {
  code?: number
  message?: string
  data?: any
}

interface BatchSearchResult {
  queries: Array<{
    query: string
    songsIds: string[]
  }>
  songs: Array<{
    id: string
    title: string
    artist: string
    album: string
  }>
}

interface PlaylistItem {
  title: string
  artist: string
  hasMatch: boolean
  matchedSongs: Array<{
    id: string
    title: string
    artist: string
    album: string
  }>
}

export default function QishuiTest() {
  useAssistSidebarContent('qishui', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  const [url, setUrl] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [checkResult, setCheckResult] = useState<{
    items: PlaylistItem[]
    stats: { total: number; found: number; notFound: number }
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'found' | 'notFound'>('all')
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { run: testPlaylist, loading: testing } = useRequest(
    async () => {
      if (!url.trim()) {
        throw new Error('Please enter a Qishui music playlist share URL')
      }

      const encodedUrl = encodeURIComponent(url.trim())
      const apiUrl = `/api/feed/qishui/playlist?url=${encodedUrl}`
      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as any[]
      setResult({
        code: 0,
        message: `Successfully parsed ${data.length} songs from playlist`,
        data,
      })
      return data
    },
    {
      manual: true,
      throttleWait: 1000,
      onError: (error: Error) => {
        alertRef.current?.show(error.message, { type: 'error' })
        setResult({
          code: 1,
          message: error.message,
          data: null,
        })
      },
    }
  )

  const { run: checkOwnership, loading: checking } = useRequest(
    async () => {
      if (!result?.data || !Array.isArray(result.data) || result.data.length === 0) {
        throw new Error('Please parse a playlist first')
      }

      // Convert playlist items to search queries
      // Use song title, or combine title and artist if available
      const queries = result.data.map((item: [string, string]) => {
        const [title, artistInfo] = item
        // Try to extract artist name from artistInfo (format: "Artist • Album")
        const artist = artistInfo.split(' • ')[0]?.trim() || ''
        // Use title + artist if artist is available, otherwise just title
        return artist ? `${title} ${artist}`.trim() : title.trim()
      })

      const response = await fetch('/api/music/batch-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ queries }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.status} ${response.statusText}`)
      }

      const batchResult = (await response.json()) as { code: number; data: BatchSearchResult; message: string }

      if (batchResult.code !== 0) {
        throw new Error(batchResult.message || 'Batch search failed')
      }

      const searchData = batchResult.data
      const songsMap = new Map<string, (typeof searchData.songs)[0]>()
      searchData.songs.forEach((song) => {
        songsMap.set(song.id, song)
      })

      // Match playlist items with search results
      const items: PlaylistItem[] = result.data.map((item: [string, string], index: number) => {
        const [title, artistInfo] = item
        const queryResult = searchData.queries[index]
        const matchedSongs = queryResult.songsIds.map((id) => songsMap.get(id)).filter((song): song is NonNullable<typeof song> => song !== undefined)

        return {
          title,
          artist: artistInfo.split(' • ')[0]?.trim() || '',
          hasMatch: matchedSongs.length > 0,
          matchedSongs,
        }
      })

      const stats = {
        total: items.length,
        found: items.filter((item) => item.hasMatch).length,
        notFound: items.filter((item) => !item.hasMatch).length,
      }

      setCheckResult({ items, stats })
      return { items, stats }
    },
    {
      manual: true,
      throttleWait: 1000,
      onError: (error: Error) => {
        alertRef.current?.show(error.message, { type: 'error' })
        setCheckResult(null)
      },
    }
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    testPlaylist()
  }

  const handleCopyNotFound = () => {
    if (!checkResult || !result?.data) return

    // Get original playlist items for not found songs
    const notFoundIndices = checkResult.items.map((item, index) => (!item.hasMatch ? index : -1)).filter((index) => index !== -1)

    const notFoundItems = notFoundIndices.map((index) => result.data[index])

    const jsonString = JSON.stringify(notFoundItems, null, 2)
    navigator.clipboard.writeText(jsonString).then(() => {
      alertRef.current?.show(`Copied ${notFoundItems.length} songs to clipboard!`, { type: 'success' })
    })
  }

  const getFilteredItems = () => {
    if (!checkResult) return []
    if (activeTab === 'found') {
      return checkResult.items.filter((item) => item.hasMatch)
    }
    if (activeTab === 'notFound') {
      return checkResult.items.filter((item) => !item.hasMatch)
    }
    return checkResult.items
  }

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Qishui Music Playlist Parser</h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Beta</span>
            <div className="ml-auto">
              <AssistSidebarTrigger contentKey="qishui" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            Parse and extract playlist data from <span className="font-medium text-gray-700">Qishui Music</span> share URLs
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-6 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 sm:p-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="qishui-url" className="text-sm font-semibold text-gray-900">
              Qishui Music Playlist Share URL
            </label>
            <input
              id="qishui-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://music.douyin.com/qishui/share/playlist?playlist_id=..."
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-gray-500">Enter the complete Qishui music playlist share URL</p>
          </div>

          <button
            type="submit"
            disabled={testing || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 disabled:hover:bg-gray-400"
          >
            {testing ? (
              <>
                <Spinner size="h-4 w-4" color="text-white" />
                <span>Parsing...</span>
              </>
            ) : (
              <span>Parse Playlist</span>
            )}
          </button>
        </form>

        {/* Result Section */}
        {result && (
          <div className="rounded-xl bg-white shadow-lg ring-1 ring-gray-200">
            {/* Header */}
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4 sm:px-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${result.code === 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {result.code === 0 ? <Check size={24} /> : <X size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Parse Result</h2>
                    <p className="text-xs text-gray-500">Playlist parsing completed</p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                    result.code === 0 ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'
                  }`}
                >
                  {result.code === 0 ? 'Success' : 'Failed'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8">
              {result.message && (
                <div className={`mb-6 rounded-lg border-l-4 p-4 ${result.code === 0 ? 'border-green-400 bg-green-50 text-green-800' : 'border-red-400 bg-red-50 text-red-800'}`}>
                  <div className="flex items-start gap-2">
                    <Info size={20} className="mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium">{result.message}</p>
                  </div>
                </div>
              )}

              {result.data && Array.isArray(result.data) && result.data.length > 0 && (
                <>
                  {/* Playlist Data Card */}
                  <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-gray-200">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">Playlist Data</span>
                          <span className="text-xs text-gray-500">
                            ({result.data.length} {result.data.length === 1 ? 'song' : 'songs'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={checkOwnership}
                          disabled={checking}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 disabled:hover:bg-gray-400"
                        >
                          {checking ? (
                            <>
                              <Spinner size="h-4 w-4" color="text-white" />
                              <span>Checking...</span>
                            </>
                          ) : (
                            <>
                              <Music size={16} />
                              <span>Check Ownership</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">
                          Playlist parsed successfully. Click "Check Ownership" to verify which songs are available in your Navidrome library.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Ownership Check Results Card */}
                  {checkResult && (
                    <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-gray-200">
                      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-900">Ownership Check Results</h3>
                      </div>
                      <div className="p-6">
                        {/* Warning */}
                        <div className="mb-4 rounded-lg border-l-4 border-yellow-400 bg-yellow-50 p-3">
                          <div className="flex items-start gap-2">
                            <Info size={20} className="mt-0.5 flex-shrink-0 text-yellow-600" />
                            <p className="text-sm font-medium text-yellow-800">
                              Note: The search results may not be 100% accurate. Songs may not be found due to different naming conventions, missing metadata, or search
                              limitations.
                            </p>
                          </div>
                        </div>

                        {/* Stats and Copy Button */}
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                              <span className="text-gray-600">
                                Found: <span className="font-semibold text-green-600">{checkResult.stats.found}</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-red-500"></div>
                              <span className="text-gray-600">
                                Not Found: <span className="font-semibold text-red-600">{checkResult.stats.notFound}</span>
                              </span>
                            </div>
                            <div className="text-gray-600">
                              Total: <span className="font-semibold">{checkResult.stats.total}</span>
                            </div>
                          </div>
                          {checkResult.stats.notFound > 0 && (
                            <button
                              type="button"
                              onClick={handleCopyNotFound}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            >
                              <Copy size={14} />
                              <span>Copy Not Found JSON</span>
                            </button>
                          )}
                        </div>

                        {/* Tabs */}
                        <div className="mb-4 flex gap-2 border-b border-gray-200">
                          <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'all' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            All ({checkResult.stats.total})
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('found')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'found' ? 'border-b-2 border-green-600 text-green-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Found ({checkResult.stats.found})
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('notFound')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${
                              activeTab === 'notFound' ? 'border-b-2 border-red-600 text-red-600' : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            Not Found ({checkResult.stats.notFound})
                          </button>
                        </div>

                        {/* Filtered Items List */}
                        <div className="max-h-[400px] space-y-2 overflow-auto">
                          {getFilteredItems().length === 0 ? (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
                              <p className="text-sm text-gray-500">No items to display</p>
                            </div>
                          ) : (
                            getFilteredItems().map((item, index) => (
                              <div key={index} className={`rounded-lg border p-3 ${item.hasMatch ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      {item.hasMatch ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-red-600" />}
                                      <span className={`font-medium ${item.hasMatch ? 'text-green-800' : 'text-red-800'}`}>{item.title}</span>
                                    </div>
                                    {item.artist && <p className="ml-6 text-sm text-gray-600">{item.artist}</p>}
                                    {item.hasMatch && item.matchedSongs.length > 0 && (
                                      <div className="ml-6 mt-2 space-y-1">
                                        <p className="text-xs font-medium text-gray-700">Matched songs:</p>
                                        {item.matchedSongs.slice(0, 3).map((song) => (
                                          <p key={song.id} className="text-xs text-gray-600">
                                            • {song.title} - {song.artist} ({song.album})
                                          </p>
                                        ))}
                                        {item.matchedSongs.length > 3 && <p className="text-xs text-gray-500">... and {item.matchedSongs.length - 3} more</p>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw Playlist Data Card */}
                  <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm ring-1 ring-gray-200">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText size={16} className="text-gray-400" />
                          <span className="text-sm font-semibold text-gray-900">Raw Playlist Data</span>
                        </div>
                        <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700">Array</span>
                      </div>
                    </div>
                    <div className="overflow-auto bg-white p-6">
                      <pre className="max-h-[600px] overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">{JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <Alert ref={alertRef} />
      </div>
    </div>
  )
}
