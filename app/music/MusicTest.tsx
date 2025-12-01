'use client'

import { useRequest } from 'ahooks'
import { Check, FileText, Info, X } from 'feather-icons-react'
import { useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'
import SearchableSelect from '@/components/SearchableSelect'
import { Spinner } from '@/components/Spinner'

import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'

type ApiType = 'query' | 'batch-query'

interface TestResult {
  code: number
  message: string
  data: any
}

export default function MusicTest() {
  useAssistSidebarContent('music', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  const [apiType, setApiType] = useState<ApiType>('query')
  const [query, setQuery] = useState('')
  const [batchQueries, setBatchQueries] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { run: testApi, loading: testing } = useRequest(
    async () => {
      if (apiType === 'query') {
        if (!query.trim()) {
          throw new Error('Please enter a search query')
        }

        const encodedQuery = encodeURIComponent(query.trim())
        const apiUrl = `/api/music/query?q=${encodedQuery}`
        const response = await fetch(apiUrl)

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`)
        }

        const data = (await response.json()) as TestResult
        setResult(data)
        return data
      } else {
        if (!batchQueries.trim()) {
          throw new Error('Please enter at least one query')
        }

        const queries = batchQueries
          .split('\n')
          .map((q) => q.trim())
          .filter((q) => q.length > 0)

        if (queries.length === 0) {
          throw new Error('Please enter at least one valid query')
        }

        const response = await fetch('/api/music/batch-query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ queries }),
        })

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status} ${response.statusText}`)
        }

        const data = (await response.json()) as TestResult
        setResult(data)
        return data
      }
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
    testApi()
  }

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Navidrome Music Search</h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Beta</span>
            <div className="ml-auto">
              <AssistSidebarTrigger contentKey="music" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            Search and query music from your <span className="font-medium text-gray-700">Navidrome</span> library using single or batch queries
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-6 rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-200 sm:p-8">
          <div className="flex flex-col gap-2">
            <label htmlFor="api-type" className="text-sm font-semibold text-gray-900">
              API Type
            </label>
            <SearchableSelect
              value={apiType}
              options={[
                { value: 'query', label: 'Single Query' },
                { value: 'batch-query', label: 'Batch Query' },
              ]}
              onChange={(value) => setApiType(value as ApiType)}
              placeholder="Select API type..."
              size="md"
              searchable={false}
              clearable={false}
            />
            <p className="text-xs text-gray-500">Select the type of search to perform</p>
          </div>

          {apiType === 'query' ? (
            <div className="flex flex-col gap-2">
              <label htmlFor="query" className="text-sm font-semibold text-gray-900">
                Search Query
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter song title, artist, or album name..."
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-xs text-gray-500">Enter a search query to find matching songs</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label htmlFor="batch-queries" className="text-sm font-semibold text-gray-900">
                Batch Queries
              </label>
              <textarea
                id="batch-queries"
                value={batchQueries}
                onChange={(event) => setBatchQueries(event.target.value)}
                placeholder="Enter one query per line...&#10;Song Title 1&#10;Artist Name 2&#10;Album Name 3"
                required
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-xs text-gray-500">Enter multiple search queries, one per line</p>
            </div>
          )}

          <button
            type="submit"
            disabled={testing}
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
                    {result.code === 0 ? <Check size={24} /> : <X size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Test Result</h2>
                    <p className="text-xs text-gray-500">Search completed</p>
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

              {result.data && (
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ring-1 ring-gray-200">
                  {/* Data Header */}
                  <div className="border-b border-gray-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900">Response Data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {Array.isArray(result.data) && result.data.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {result.data.length} {result.data.length === 1 ? 'song' : 'songs'}
                          </span>
                        )}
                        {result.data?.songs && Array.isArray(result.data.songs) && (
                          <span className="text-xs text-gray-500">
                            {result.data.songs.length} {result.data.songs.length === 1 ? 'song' : 'songs'}
                          </span>
                        )}
                        {result.data?.queries && Array.isArray(result.data.queries) && (
                          <span className="text-xs text-gray-500">
                            {result.data.queries.length} {result.data.queries.length === 1 ? 'query' : 'queries'}
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
