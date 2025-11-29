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

type ApiType = 'company' | 'summary'

interface TestResult {
  code: number
  message: string
  data: any
}

export default function TasiTest() {
  useAssistSidebarContent('tasi', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  const [apiType, setApiType] = useState<ApiType>('company')
  const [result, setResult] = useState<TestResult | null>(null)
  const alertRef = useRef<AlertImperativeHandler>(null)

  const { run: testApi, loading: testing } = useRequest(
    async () => {
      const apiUrl = `/api/finance/tasi/${apiType}/daily`
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
    testApi()
  }

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-5xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-3 border-b border-gray-200 pb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold text-gray-900">TASI Finance Data Test</h1>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">Beta</span>
            <div className="ml-auto">
              <AssistSidebarTrigger contentKey="tasi" />
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-500">
            Fetch and test TASI (Tadawul All Share Index) daily finance data including <span className="font-medium text-gray-700">company records</span> and{' '}
            <span className="font-medium text-gray-700">market summary</span>
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
                { value: 'company', label: 'Company Daily Records' },
                { value: 'summary', label: 'Market Daily Summary' },
              ]}
              onChange={(value) => setApiType(value as ApiType)}
              placeholder="Select API type..."
              size="md"
              searchable={false}
              clearable={false}
            />
            <p className="text-xs text-gray-500">Select the type of finance data to fetch</p>
          </div>

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
                    <p className="text-xs text-gray-500">Data fetch completed</p>
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
                <>
                  {/* Parsed Data Display */}
                  {apiType === 'summary' && !Array.isArray(result.data) && (
                    <div className="mb-6 rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 ring-1 ring-gray-200">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">Market Summary</h3>
                      {result.data.date && (
                        <div className="mb-4 rounded-md bg-white px-4 py-2 ring-1 ring-gray-200">
                          <span className="text-sm font-medium text-gray-600">Date: </span>
                          <span className="text-sm font-semibold text-gray-900">{result.data.date}</span>
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {result.data.open !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Open</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.open.toLocaleString()} SAR</div>
                          </div>
                        )}
                        {result.data.high !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">High</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.high.toLocaleString()} SAR</div>
                          </div>
                        )}
                        {result.data.low !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Low</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.low.toLocaleString()} SAR</div>
                          </div>
                        )}
                        {result.data.close !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Close</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.close.toLocaleString()} SAR</div>
                          </div>
                        )}
                        {result.data.change !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Change</div>
                            <div className={`mt-1 text-lg font-semibold ${result.data.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {result.data.change >= 0 ? '+' : ''}
                              {result.data.change.toLocaleString()} SAR
                            </div>
                          </div>
                        )}
                        {result.data.changePercent !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Change %</div>
                            <div className={`mt-1 text-lg font-semibold ${result.data.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {result.data.changePercent >= 0 ? '+' : ''}
                              {result.data.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        )}
                        {result.data.companiesTraded !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Companies Traded</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.companiesTraded.toLocaleString()}</div>
                          </div>
                        )}
                        {result.data.volumeTraded !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Volume Traded</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.volumeTraded.toLocaleString()}</div>
                          </div>
                        )}
                        {result.data.valueTraded !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Value Traded</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.valueTraded.toLocaleString()} SAR</div>
                          </div>
                        )}
                        {result.data.numberOfTrades !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Number of Trades</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.numberOfTrades.toLocaleString()}</div>
                          </div>
                        )}
                        {result.data.marketCap !== null && (
                          <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
                            <div className="text-xs font-medium text-gray-500">Market Cap</div>
                            <div className="mt-1 text-lg font-semibold text-gray-900">{result.data.marketCap.toLocaleString()} SAR</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {apiType === 'company' && Array.isArray(result.data) && result.data.length > 0 && (
                    <div className="mb-6 rounded-lg border border-gray-200 bg-white ring-1 ring-gray-200">
                      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-4">
                        <h3 className="text-lg font-semibold text-gray-900">Company Records</h3>
                        {result.data[0]?.date && <p className="mt-1 text-sm text-gray-500">Date: {result.data[0].date}</p>}
                        <p className="mt-1 text-sm text-gray-500">{result.data.length} companies</p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-700">Name</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Last Price</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Change %</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Volume</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Turnover</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-700">Market Cap</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {result.data.slice(0, 50).map((company: any, index: number) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">{company.code || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{company.name || '-'}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                                  {company.lastPrice !== null ? company.lastPrice.toLocaleString() : '-'}
                                </td>
                                <td
                                  className={`whitespace-nowrap px-4 py-3 text-right text-sm font-medium ${
                                    company.changePercent !== null ? (company.changePercent >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-500'
                                  }`}
                                >
                                  {company.changePercent !== null ? `${company.changePercent >= 0 ? '+' : ''}${company.changePercent.toFixed(2)}%` : '-'}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">{company.volume !== null ? company.volume.toLocaleString() : '-'}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                                  {company.turnover !== null ? company.turnover.toLocaleString() : '-'}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-500">
                                  {company.marketCap !== null ? company.marketCap.toLocaleString() : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {result.data.length > 50 && (
                          <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-center text-sm text-gray-500">
                            Showing first 50 of {result.data.length} companies. See JSON below for full data.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* JSON Data */}
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
                          <span className="text-sm font-semibold text-gray-900">Raw JSON Data</span>
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
