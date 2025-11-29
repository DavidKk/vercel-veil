'use client'

import { useState } from 'react'

import SearchableSelect from '@/components/SearchableSelect'

import DoubanToTMDB from './DoubanToTMDB'

type SyncType = 'douban-rss'

interface SyncSource {
  id: SyncType
  name: string
  description: string
}

const SYNC_SOURCES: SyncSource[] = [
  {
    id: 'douban-rss',
    name: 'Douban RSS',
    description: 'Sync Douban movie list from RSS feed to TMDB favorites',
  },
]

export default function SyncContent() {
  const [selectedSource, setSelectedSource] = useState<SyncType>('douban-rss')

  const selectedSourceConfig = SYNC_SOURCES.find((source) => source.id === selectedSource)

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold text-gray-900">TMDB Sync</h1>
              <p className="text-sm leading-relaxed text-gray-500">Sync your movie lists from various sources to TMDB favorites. Select a source below to get started.</p>
            </div>
          </div>
        </div>

        {/* Source Selector */}
        <div className="mb-6">
          <label htmlFor="sync-source" className="mb-2 block text-sm font-medium text-gray-700">
            Select Source
          </label>
          <SearchableSelect
            value={selectedSource}
            options={SYNC_SOURCES.map((source) => ({
              value: source.id,
              label: source.name,
            }))}
            onChange={(value) => setSelectedSource(value as SyncType)}
            placeholder="Select sync source..."
            size="md"
            searchable={false}
            clearable={false}
          />
          {selectedSourceConfig && <p className="mt-2 text-xs text-gray-500">{selectedSourceConfig.description}</p>}
        </div>

        {/* Sync Content */}
        <div className="rounded-xl bg-white shadow-lg ring-1 ring-gray-200">{selectedSource === 'douban-rss' && <DoubanToTMDB />}</div>
      </div>
    </div>
  )
}
