'use client'

import { Share2 } from 'feather-icons-react'
import { useState } from 'react'

import { AssistSidebarTrigger, useAssistSidebarContent } from '@/components/AssistSidebar'

import ShareModal from './components/ShareModal'

interface AnimePageContentProps {
  children: React.ReactNode
  hideShareButton?: boolean
}

export default function AnimePageContent({ children, hideShareButton = false }: AnimePageContentProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  useAssistSidebarContent('anime', [
    {
      key: 'overview',
      title: 'Overview',
      markdown: `# Anime Recommendations

This page displays trending and upcoming anime from AniList.

## Data Sources

- **Trending Anime**: Recently aired anime (within the last month) sorted by trending score
- **Upcoming Anime**: Anime scheduled to air in the next month

## Features

- Real-time data from AniList GraphQL API
- GIST cache for fast loading
- Responsive design for desktop and mobile
- Share functionality to share anime lists`,
    },
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
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Anime Recommendations</h1>
                  <span className="self-center sm:self-auto rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 whitespace-nowrap">Daily Update</span>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">
                  Merged <span className="font-medium text-gray-700">Trending</span> and <span className="font-medium text-gray-700">Upcoming</span> anime from AniList, helping you
                  discover quality anime series
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!hideShareButton && (
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    title="Share anime list"
                  >
                    <Share2 size={16} />
                    <span className="hidden sm:inline">Share</span>
                  </button>
                )}
                <AssistSidebarTrigger contentKey="anime" />
              </div>
            </div>
          </div>

          {/* Anime List */}
          {children}
        </div>
      </div>
    </>
  )
}
