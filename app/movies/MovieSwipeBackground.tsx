'use client'

import { useEffect } from 'react'

interface MovieSwipeBackgroundProps {
  currentPosterUrl: string | null
  nextPosterUrl: string | null
  scrollProgress: number // 0-1, 0 = current, 1 = next
}

export default function MovieSwipeBackground({ currentPosterUrl, nextPosterUrl, scrollProgress }: MovieSwipeBackgroundProps) {
  // Default placeholder image
  const placeholderImage =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect fill="%231f2937" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E'

  // Use placeholder if URL is empty
  const currentSrc = currentPosterUrl || placeholderImage
  const nextSrc = nextPosterUrl || null

  // Preload images for smooth transition
  useEffect(() => {
    if (currentPosterUrl) {
      const img = new Image()
      img.src = currentPosterUrl
    }
  }, [currentPosterUrl])

  useEffect(() => {
    if (nextPosterUrl) {
      const img = new Image()
      img.src = nextPosterUrl
    }
  }, [nextPosterUrl])

  const currentOpacity = 1 - scrollProgress
  const nextOpacity = scrollProgress

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Current background */}
      <div
        className="absolute inset-0 transition-opacity duration-0"
        style={{
          opacity: currentOpacity,
        }}
      >
        <img
          src={currentSrc}
          alt=""
          className="h-full w-full object-cover opacity-40"
          loading="eager"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.src = placeholderImage
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
      </div>

      {/* Next background (if exists) */}
      {nextSrc && (
        <div
          className="absolute inset-0 transition-opacity duration-0"
          style={{
            opacity: nextOpacity,
          }}
        >
          <img
            src={nextSrc}
            alt=""
            className="h-full w-full object-cover opacity-40"
            loading="eager"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = placeholderImage
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
        </div>
      )}
    </div>
  )
}
