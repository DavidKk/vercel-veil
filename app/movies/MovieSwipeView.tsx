'use client'

import { useEffect, useRef, useState } from 'react'

import type { MergedMovie } from '@/services/maoyan/types'

import MovieSwipeCard from './MovieSwipeCard'

interface MovieSwipeViewProps {
  movies: MergedMovie[]
  favoriteAvailable: boolean
  favoriteIds: Set<number>
}

export default function MovieSwipeView({ movies, favoriteAvailable, favoriteIds }: MovieSwipeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  const translateY = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isAnimatingRef = useRef<boolean>(false)

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    if (containerRef.current) {
      containerRef.current.style.transition = 'none'
    }
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || isAnimatingRef.current) return

    e.preventDefault() // Prevent scrolling
    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStartY.current
    translateY.current = deltaY

    // Use requestAnimationFrame for smooth updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return

      // Apply transform with bounds
      const baseOffset = -currentIndex * 100
      const dragOffset = (deltaY / window.innerHeight) * 100
      const newOffset = baseOffset + dragOffset

      // Limit drag range
      const minOffset = -(movies.length - 1) * 100
      const maxOffset = 0
      const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset))

      containerRef.current.style.transform = `translateY(${clampedOffset}%)`
    })
  }

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!containerRef.current || isAnimatingRef.current) return

    // Cancel any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    const touchEndY = e.changedTouches[0].clientY
    const deltaY = touchEndY - touchStartY.current
    const deltaTime = Date.now() - touchStartTime.current
    const velocity = deltaTime > 0 ? Math.abs(deltaY / deltaTime) : 0

    const threshold = window.innerHeight * 0.15 // 15% of screen height
    const velocityThreshold = 0.3 // pixels per millisecond

    // Determine if should switch
    let newIndex = currentIndex
    if (Math.abs(deltaY) > threshold || velocity > velocityThreshold) {
      if (deltaY > 0 && currentIndex > 0) {
        // Swipe down - go to previous
        newIndex = currentIndex - 1
      } else if (deltaY < 0 && currentIndex < movies.length - 1) {
        // Swipe up - go to next
        newIndex = currentIndex + 1
      }
    }

    // Prevent multiple animations
    if (newIndex === currentIndex) {
      // Reset to current position
      containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      containerRef.current.style.transform = `translateY(-${currentIndex * 100}%)`
      return
    }

    // Animate to target
    isAnimatingRef.current = true
    setCurrentIndex(newIndex)
    containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    containerRef.current.style.transform = `translateY(-${newIndex * 100}%)`

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset after animation
    timeoutRef.current = setTimeout(() => {
      translateY.current = 0
      isAnimatingRef.current = false
      timeoutRef.current = null
    }, 300)
  }

  // Prevent scroll on body when swiping
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!movies || movies.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">No movies available</p>
          <p className="mt-2 text-sm text-gray-600">Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-black touch-none">
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ transform: `translateY(-${currentIndex * 100}%)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {movies.map((movie, index) => (
          <div key={`${movie.source}-${movie.maoyanId}`} className="absolute h-screen w-full" style={{ top: `${index * 100}%` }}>
            <MovieSwipeCard movie={movie} favoriteAvailable={favoriteAvailable} isFavorited={movie.tmdbId ? favoriteIds.has(movie.tmdbId) : false} />
          </div>
        ))}
      </div>
    </div>
  )
}
