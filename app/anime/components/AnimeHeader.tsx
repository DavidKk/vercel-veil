'use client'

import { ArrowLeft, Home, Share2 } from 'feather-icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'

import ShareModal from './ShareModal'

interface AnimeHeaderProps {
  hideShareButton?: boolean
}

export default function AnimeHeader({ hideShareButton = false }: AnimeHeaderProps) {
  const pathname = usePathname()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  // Check if it's a detail page: path contains /anime/ but is not /anime itself
  const isDetailPage = useMemo(() => {
    if (!pathname) return false
    return pathname.includes('/anime/') && pathname !== '/anime'
  }, [pathname])
  // Check if it's a share page
  const isSharePage = useMemo(() => {
    if (!pathname) return false
    return pathname.includes('/anime/share/')
  }, [pathname])

  return (
    <>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      <header className="hidden lg:block sticky top-0 z-[100] w-full border-b-2 border-pink-300 bg-white shadow-md">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left Section - Navigation */}
            <div className="flex items-center gap-3">
              {isDetailPage ? (
                <Link
                  href="/anime"
                  className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-pink-600 shadow-md hover:shadow-lg hover:scale-105"
                  title="Back to Anime"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </Link>
              ) : (
                <Link
                  href="/"
                  prefetch={true}
                  className="flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-pink-600 shadow-md hover:shadow-lg hover:scale-105"
                  title="Home"
                >
                  <Home size={16} />
                  <span>Home</span>
                </Link>
              )}
            </div>

            {/* Center Section - Title */}
            <div className="flex-1 text-center">
              {!isDetailPage ? (
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">Anime</h1>
              ) : (
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">Anime Details</h1>
              )}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              {!hideShareButton && !isDetailPage && !isSharePage && (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center justify-center rounded-xl bg-purple-500 p-2.5 text-white transition-all hover:bg-purple-600 shadow-md hover:shadow-lg hover:scale-110"
                  title="Share anime list"
                >
                  <Share2 size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
