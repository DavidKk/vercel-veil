'use client'

import { Share2 } from 'feather-icons-react'
import { useState } from 'react'

import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'

import ShareModal from './components/ShareModal'
import overviewDoc from './docs/overview.md?raw'
import usageDoc from './docs/usage.md?raw'

interface MoviesPageContentProps {
  children: React.ReactNode
  hideShareButton?: boolean
}

export default function MoviesPageContent({ children, hideShareButton = false }: MoviesPageContentProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useAssistSidebarContent('movies', [
    { key: 'overview', title: 'Overview', markdown: overviewDoc },
    { key: 'usage', title: 'Usage Guide', markdown: usageDoc },
  ])

  return (
    <>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      <div className="flex min-h-[calc(100vh-64px-60px)] flex-col bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-7xl">
          {/* Header Section */}
          <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Movie Recommendations</h1>
                  <span className="self-center sm:self-auto rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 whitespace-nowrap">Daily Update</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">
                  Merged <span className="font-medium text-gray-700">Top Rated</span> and <span className="font-medium text-gray-700">Most Expected</span> lists from Maoyan,
                  enriched with TMDB details to help you discover quality movies
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!hideShareButton && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    title="Share movie list"
                  >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                )}
                <AssistSidebarTrigger contentKey="movies" />
              </div>
            </div>
          </div>

          {/* Movie List */}
          {children}
        </div>
      </div>
    </>
  )
}
