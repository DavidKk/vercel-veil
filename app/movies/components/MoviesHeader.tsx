'use client'

import { ArrowLeft, Home, Share2 } from 'feather-icons-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo, useState } from 'react'

import ShareModal from './ShareModal'

interface MoviesHeaderProps {
  hideShareButton?: boolean
}

export default function MoviesHeader({ hideShareButton = false }: MoviesHeaderProps) {
  const pathname = usePathname()
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  // 判断是否是详情页：路径包含 /movies/ 且不是 /movies 本身
  const isDetailPage = useMemo(() => {
    if (!pathname) return false
    return pathname.includes('/movies/') && pathname !== '/movies'
  }, [pathname])
  // 判断是否是分享页面
  const isSharePage = useMemo(() => {
    if (!pathname) return false
    return pathname.includes('/movies/share/')
  }, [pathname])

  return (
    <>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      <header className="hidden lg:block sticky top-0 z-[100] w-full border-b border-white/10 bg-black/40 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left Section - Navigation */}
            <div className="flex items-center gap-3">
              {isDetailPage ? (
                <Link
                  href="/movies"
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 border border-white/10"
                  title="Back to Movies"
                >
                  <ArrowLeft size={16} />
                  <span>Back</span>
                </Link>
              ) : (
                <Link
                  href="/"
                  prefetch={true}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 border border-white/10"
                  title="Home"
                >
                  <Home size={16} />
                  <span>Home</span>
                </Link>
              )}
            </div>

            {/* Center Section - Title */}
            <div className="flex-1 text-center">
              {!isDetailPage ? <h1 className="text-xl font-bold text-white">Movies</h1> : <h1 className="text-xl font-bold text-white">Movie Details</h1>}
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
              {!hideShareButton && !isDetailPage && !isSharePage && (
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="flex items-center justify-center rounded-lg bg-white/10 backdrop-blur-md p-2 text-white transition-all hover:bg-white/20 border border-white/20"
                  title="Share movie list"
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
