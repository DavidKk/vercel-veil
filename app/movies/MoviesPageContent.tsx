'use client'

import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'

import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'

interface MoviesPageContentProps {
  children: React.ReactNode
}

export default function MoviesPageContent({ children }: MoviesPageContentProps) {
  useAssistSidebarContent('movies', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Movie Recommendations</h1>
                <span className="self-start rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 whitespace-nowrap">Daily Update</span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500">
                Merged <span className="font-medium text-gray-700">Top Rated</span> and <span className="font-medium text-gray-700">Most Expected</span> lists from Maoyan, enriched
                with TMDB details to help you discover quality movies
              </p>
            </div>
            <div className="flex-shrink-0">
              <AssistSidebarTrigger contentKey="movies" />
            </div>
          </div>
        </div>

        {/* Movie List */}
        {children}
      </div>
    </div>
  )
}
