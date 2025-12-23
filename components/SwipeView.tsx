'use client'

import { Share2 } from 'feather-icons-react'
import React, { useEffect, useRef, useState } from 'react'

import SwipeBackground from './SwipeBackground'

interface SwipeViewProps<T> {
  items: T[]
  getImageUrl: (item: T) => string | null
  renderItem: (item: T, index: number) => React.ReactNode
  getItemKey: (item: T, index: number) => string
  shareModal?: React.ReactNode
  shareToken?: string
  emptyMessage?: {
    title: string
    description: string
  }
}

export default function SwipeView<T>({
  items,
  getImageUrl,
  renderItem,
  getItemKey,
  shareModal,
  shareToken,
  emptyMessage = { title: 'No items available', description: 'Please try later' },
}: SwipeViewProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0) // 0-1, 0 = current, 1 = next
  const [viewportHeight, setViewportHeight] = useState(0)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  // Handle Chrome mobile bottom toolbar by using dynamic viewport height
  useEffect(() => {
    const updateViewportHeight = () => {
      // Use window.innerHeight which excludes browser UI (toolbars)
      const vh = window.innerHeight
      setViewportHeight(vh)

      // Apply to wrapper and container
      if (wrapperRef.current) {
        wrapperRef.current.style.height = `${vh}px`
      }
      if (containerRef.current) {
        containerRef.current.style.height = `${vh}px`
      }
    }

    // Initial calculation
    updateViewportHeight()

    // Update on resize (handles Chrome toolbar show/hide)
    window.addEventListener('resize', updateViewportHeight, { passive: true })
    window.addEventListener('orientationchange', updateViewportHeight, { passive: true })

    // Also listen to visualViewport API if available (better for Chrome)
    const visualViewport = window.visualViewport
    if (visualViewport) {
      const handleViewportChange = () => {
        updateViewportHeight()
      }
      visualViewport.addEventListener('resize', handleViewportChange)
      visualViewport.addEventListener('scroll', handleViewportChange)

      return () => {
        window.removeEventListener('resize', updateViewportHeight)
        window.removeEventListener('orientationchange', updateViewportHeight)
        visualViewport.removeEventListener('resize', handleViewportChange)
        visualViewport.removeEventListener('scroll', handleViewportChange)
      }
    }

    return () => {
      window.removeEventListener('resize', updateViewportHeight)
      window.removeEventListener('orientationchange', updateViewportHeight)
    }
  }, [])

  // Prevent body scroll and ensure smooth scrolling
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // Calculate scroll progress for background transition and detect near bottom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const vh = viewportHeight || window.innerHeight
      const currentScrollIndex = scrollTop / vh
      const currentIdx = Math.floor(currentScrollIndex)
      const progress = currentScrollIndex - currentIdx

      setCurrentIndex(currentIdx)
      setScrollProgress(progress)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [items, viewportHeight])

  // Get image URLs for current and next item
  const currentItem = items[currentIndex]
  const nextItem = items[currentIndex + 1]
  const currentImageUrl = currentItem ? getImageUrl(currentItem) : null
  const nextImageUrl = nextItem ? getImageUrl(nextItem) : null

  if (!items || items.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-lg font-semibold text-white">{emptyMessage.title}</p>
          <p className="mt-2 text-sm text-gray-400">{emptyMessage.description}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="fixed inset-0 bg-black" style={{ height: viewportHeight || '100dvh' }}>
      {/* Background component with fade transition */}
      <SwipeBackground currentImageUrl={currentImageUrl} nextImageUrl={nextImageUrl} scrollProgress={scrollProgress} />

      {/* Share button - top right corner (hidden on share page) */}
      {!shareToken && shareModal && (
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="fixed top-3 right-3 z-20 flex items-center justify-center rounded-full bg-white/20 p-2.5 backdrop-blur-md transition-all hover:bg-white/30 active:scale-95 shadow-lg"
          title="Share list"
        >
          <Share2 size={16} className="text-white" />
        </button>
      )}

      <div
        ref={containerRef}
        className="relative h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide z-10"
        style={{
          height: viewportHeight || '100dvh',
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollSnapType: 'y mandatory',
        }}
      >
        {items.map((item, index) => (
          <div key={getItemKey(item, index)} className="relative w-full snap-start snap-always flex-shrink-0" style={{ height: viewportHeight || '100dvh' }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Share Modal */}
      {shareModal &&
        React.isValidElement(shareModal) &&
        React.cloneElement(shareModal as React.ReactElement<{ isOpen: boolean; onClose: () => void }>, {
          isOpen: isShareModalOpen,
          onClose: () => setIsShareModalOpen(false),
        })}
    </div>
  )
}
