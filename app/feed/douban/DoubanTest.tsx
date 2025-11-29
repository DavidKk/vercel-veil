'use client'

import { useRequest } from 'ahooks'
import { useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'
import SearchableSelect from '@/components/SearchableSelect'
import { Spinner } from '@/components/Spinner'

import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'

type FeedType = 'sonarr' | 'radarr'

interface TestResult {
  code: number
  message: string
  data: any
}

export default function DoubanTest() {
  useAssistSidebarContent('douban', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  const [url, setUrl] = useState('')
  const [feedType, setFeedType] = useState<FeedType>('sonarr')
  const [result, setResult] = useState<TestResult | null>(null)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { run: testFeed, loading: testing } = useRequest(
    async () => {
      if (!url.trim()) {
        throw new Error('Please enter a Douban RSS URL')
      }

      const encodedUrl = encodeURIComponent(url.trim())
      const apiUrl = `/api/feed/douban/${feedType}?url=${encodedUrl}`
      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }

      const data = (await response.json()) as TestResult
      setResult(data)
      return data
    },
    {
      manual: true,
      throttleWait: 1000,
      onError: (error: Error) => {
        alertRef.current?.show(error.message, { type: 'error' })
        setResult(null)
      },
    }
  )

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    testFeed()
  }

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Douban RSS Feed Tester</h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Beta</span>
            <div className="ml-auto">
              <AssistSidebarTrigger contentKey="douban" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            Convert and test Douban RSS feeds for seamless integration with <span className="font-medium text-gray-700">Sonarr</span> and{' '}
            <span className="font-medium text-gray-700">Radarr</span>
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-6 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 sm:p-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="douban-url" className="text-sm font-semibold text-gray-900">
              Douban RSS URL
            </label>
            <input
              id="douban-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.douban.com/feed/people/{Your_Douban_ID}/interests"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-xs text-gray-500">Enter the complete Douban RSS feed URL from your interests page</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="feed-type" className="text-sm font-semibold text-gray-900">
              Feed Type
            </label>
            <SearchableSelect
              value={feedType}
              options={[
                { value: 'sonarr', label: 'Sonarr (TV Series)' },
                { value: 'radarr', label: 'Radarr (Movies)' },
              ]}
              onChange={(value) => setFeedType(value as FeedType)}
              placeholder="Select feed type..."
              size="md"
              searchable={false}
              clearable={false}
            />
            <p className="text-xs text-gray-500">Select the target media server type</p>
          </div>

          <button
            type="submit"
            disabled={testing || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-60 disabled:hover:bg-gray-400"
          >
            {testing ? (
              <>
                <Spinner size="h-4 w-4" color="text-white" />
                <span>Testing...</span>
              </>
            ) : (
              <span>Run Test</span>
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
                    {result.code === 0 ? (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Test Result</h2>
                    <p className="text-xs text-gray-500">Feed conversion completed</p>
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
                    <svg className="mt-0.5 h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">{result.message}</p>
                  </div>
                </div>
              )}

              {result.data && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ring-1 ring-gray-200">
                  {/* Data Header */}
                  <div className="border-b border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span className="text-sm font-semibold text-gray-900">Response Data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {Array.isArray(result.data) && result.data.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {result.data.length} {result.data.length === 1 ? 'item' : 'items'}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            Array.isArray(result.data) ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {Array.isArray(result.data) ? 'Array' : 'Object'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Data Content */}
                  <div className="overflow-auto bg-white p-4">
                    <pre className="max-h-[600px] overflow-auto rounded-md bg-gray-900 p-4 text-xs leading-relaxed text-gray-100">{JSON.stringify(result.data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <Alert ref={alertRef} />
      </div>
    </div>
  )
}
