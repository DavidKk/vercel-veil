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
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const touchStartTime = useRef<number>(0)
  const translateY = useRef<number>(0)

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
    setIsTransitioning(false)
    if (containerRef.current) {
      containerRef.current.style.transition = 'none'
    }
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current) return

    e.preventDefault() // Prevent scrolling
    const currentY = e.touches[0].clientY
    const deltaY = currentY - touchStartY.current
    translateY.current = deltaY

    // Apply transform with bounds
    const baseOffset = -currentIndex * 100
    const dragOffset = (deltaY / window.innerHeight) * 100
    const newOffset = baseOffset + dragOffset

    // Limit drag range
    const minOffset = -(movies.length - 1) * 100
    const maxOffset = 0
    const clampedOffset = Math.max(minOffset, Math.min(maxOffset, newOffset))

    containerRef.current.style.transform = `translateY(${clampedOffset}%)`
  }

  // Handle touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!containerRef.current) return

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

    // Animate to target
    setIsTransitioning(true)
    setCurrentIndex(newIndex)
    containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    containerRef.current.style.transform = `translateY(-${newIndex * 100}%)`

    // Reset after animation
    setTimeout(() => {
      translateY.current = 0
    }, 300)
  }

  // Reset transform on index change
  useEffect(() => {
    if (containerRef.current && isTransitioning) {
      containerRef.current.style.transform = `translateY(-${currentIndex * 100}%)`
    }
  }, [currentIndex, isTransitioning])

  // Prevent scroll on body when swiping
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
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
