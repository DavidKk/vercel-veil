'use client'

import { useRequest } from 'ahooks'
import { AlertCircle, Check, Info, X } from 'feather-icons-react'
import { useRef, useState } from 'react'

import type { AlertImperativeHandler } from '@/components/Alert'
import Alert from '@/components/Alert'
import { Spinner } from '@/components/Spinner'
import { Switch } from '@/components/Switch'
import type { CloudflareCheckResult } from '@/services/cloudflare/types'

type RequestType = 'server' | 'client'

interface TestResult {
  type: RequestType
  url: string
  result: CloudflareCheckResult | null
  error: string | null
  timestamp: number
}

export default function CloudflareCheck() {
  const [url, setUrl] = useState('')
  const [requestType, setRequestType] = useState<RequestType>('server')
  const [results, setResults] = useState<TestResult[]>([])
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { run: testServerSide, loading: testingServer } = useRequest(
    async () => {
      if (!url.trim()) {
        throw new Error('Please enter a URL to test')
      }

      const encodedUrl = encodeURIComponent(url.trim())
      const apiUrl = `/api/cloudflare-test?url=${encodedUrl}`
      const response = await fetch(apiUrl)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.data as CloudflareCheckResult
    },
    {
      manual: true,
      onSuccess: (result) => {
        setResults((prev) => [
          {
            type: 'server',
            url: url.trim(),
            result,
            error: null,
            timestamp: Date.now(),
          },
          ...prev,
        ])
      },
      onError: (error) => {
        setResults((prev) => [
          {
            type: 'server',
            url: url.trim(),
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          },
          ...prev,
        ])
        alertRef.current?.show(error instanceof Error ? error.message : 'Unknown error occurred', { type: 'error' })
      },
    }
  )

  const { run: testClientSide, loading: testingClient } = useRequest(
    async () => {
      if (!url.trim()) {
        throw new Error('Please enter a URL to test')
      }

      // Direct client-side fetch
      const response = await fetch(url.trim(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      // Check response
      const contentType = response.headers.get('content-type') || ''
      const isHtml = contentType.toLowerCase().includes('text/html')
      const statusCode = response.status
      const isFromCloudflare = response.headers.get('server')?.toLowerCase() === 'cloudflare' || !!response.headers.get('cf-ray') || !!response.headers.get('cf-request-id')

      let bodyText = ''
      try {
        bodyText = await response.text()
      } catch {
        // Ignore body read errors
      }

      // Simple client-side detection
      const bodyIndicators: string[] = []
      const lowerBody = bodyText.toLowerCase()
      const challengeKeywords = ['just a moment', 'checking your browser', 'cf-browser-verification', 'cloudflare', 'ddos protection']

      for (const keyword of challengeKeywords) {
        if (lowerBody.includes(keyword)) {
          bodyIndicators.push(keyword)
        }
      }

      const isBlocked = !response.ok || isHtml || (isFromCloudflare && statusCode !== 200) || bodyIndicators.length > 0

      let reason: string | undefined
      if (isBlocked) {
        if (isHtml) {
          reason = 'HTML response instead of expected API response - Possibly blocked by Cloudflare'
        } else if (statusCode === 403) {
          reason = 'HTTP 403 Forbidden - Possibly blocked by Cloudflare'
        } else if (statusCode === 429) {
          reason = 'HTTP 429 Too Many Requests - Rate limited by Cloudflare'
        } else if (statusCode === 503) {
          reason = 'HTTP 503 Service Unavailable - Cloudflare protection mode active'
        } else if (bodyIndicators.length > 0) {
          reason = `Cloudflare challenge page detected: ${bodyIndicators.join(', ')}`
        } else if (isFromCloudflare) {
          reason = `Cloudflare response with status ${statusCode} - Possibly blocked`
        }
      }

      const result: CloudflareCheckResult = {
        isBlocked,
        reason,
        blockReason: isBlocked ? 'unknown' : undefined,
        indicators: [
          ...(isFromCloudflare ? ['cloudflare-headers'] : []),
          ...(isHtml ? ['html-response-unexpected'] : []),
          ...(statusCode ? [`status-${statusCode}`] : []),
          ...bodyIndicators.map((ind) => `body-${ind}`),
        ],
        statusCode,
        isCloudflareResponse: isFromCloudflare,
        headers: Object.fromEntries(response.headers.entries()),
        bodySnippet: bodyText.substring(0, 500),
      }

      return result
    },
    {
      manual: true,
      onSuccess: (result) => {
        setResults((prev) => [
          {
            type: 'client',
            url: url.trim(),
            result,
            error: null,
            timestamp: Date.now(),
          },
          ...prev,
        ])
      },
      onError: (error) => {
        setResults((prev) => [
          {
            type: 'client',
            url: url.trim(),
            result: null,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
          },
          ...prev,
        ])
        alertRef.current?.show(error instanceof Error ? error.message : 'Unknown error occurred', { type: 'error' })
      },
    }
  )

  const handleTest = () => {
    if (requestType === 'server') {
      testServerSide()
    } else {
      testClientSide()
    }
  }

  const isLoading = testingServer || testingClient

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Alert ref={alertRef} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Cloudflare</h1>
        <p className="text-gray-600 dark:text-gray-400">Check if a service URL is blocked by Cloudflare. Compare server-side and client-side detection.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="url" className="block text-sm font-medium mb-2">
              URL to Test
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com or https://your-service.com"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Request Type</label>
            <div className="flex items-center gap-3">
              <span className={`text-sm ${requestType === 'server' ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                Server-side (via API)
              </span>
              <Switch checked={requestType === 'client'} onChange={(checked) => setRequestType(checked ? 'client' : 'server')} disabled={isLoading} size="md" variant="primary" />
              <span className={`text-sm ${requestType === 'client' ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
                Client-side (direct fetch)
              </span>
            </div>
          </div>

          <button
            onClick={handleTest}
            disabled={isLoading || !url.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Spinner size="w-4 h-4" color="text-white" />
                Testing...
              </>
            ) : (
              'Test URL'
            )}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Test Results</h2>
          {results.map((testResult, index) => (
            <TestResultCard key={index} result={testResult} />
          ))}
        </div>
      )}
    </div>
  )
}

function TestResultCard({ result }: { result: TestResult }) {
  const { type, url, result: checkResult, error, timestamp } = result

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              type === 'server' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}
          >
            {type === 'server' ? 'Server-side' : 'Client-side'}
          </span>
          {checkResult && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
                checkResult.isBlocked ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}
            >
              {checkResult.isBlocked ? (
                <>
                  <X className="w-3 h-3" />
                  Blocked
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  Not Blocked
                </>
              )}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(timestamp).toLocaleTimeString()}</span>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">URL:</p>
        <p className="font-mono text-sm break-all">{url}</p>
      </div>

      {error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : checkResult ? (
        <div className="space-y-4">
          {checkResult.reason && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200 mb-2">
                <Info className="w-5 h-5" />
                <span className="font-medium">Reason</span>
              </div>
              <p className="text-sm">{checkResult.reason}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2">Status Code</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{checkResult.statusCode || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Block Reason Type</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{checkResult.blockReason || 'N/A'}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Cloudflare Response</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{checkResult.isCloudflareResponse ? 'Yes' : 'No'}</p>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Indicators</p>
              <div className="flex flex-wrap gap-1">
                {checkResult.indicators.length > 0 ? (
                  checkResult.indicators.map((indicator, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded">
                      {indicator}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-400">None</span>
                )}
              </div>
            </div>
          </div>

          {checkResult.bodySnippet && (
            <div>
              <p className="text-sm font-medium mb-2">Response Body Snippet (first 500 chars)</p>
              <pre className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40">{checkResult.bodySnippet}</pre>
            </div>
          )}

          {checkResult.headers && Object.keys(checkResult.headers).length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Response Headers</p>
              <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded text-xs overflow-auto max-h-40">
                {Object.entries(checkResult.headers).map(([key, value]) => (
                  <div key={key} className="mb-1">
                    <span className="font-medium">{key}:</span> <span>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
