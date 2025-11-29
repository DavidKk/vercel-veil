'use client'

import { Image as ImageIcon } from 'feather-icons-react'
import { useEffect, useRef, useState } from 'react'

interface LazyImageProps {
  src: string
  alt: string
  className?: string
  loading?: 'lazy' | 'eager'
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void
  /**
   * Preload distance in viewport heights (vh)
   * Images within this distance will start loading before entering viewport
   * Default: 1.5 (load images 1.5 viewport heights before they enter viewport)
   * Only used for desktop/PC viewport-based loading
   */
  preloadDistance?: number
  /**
   * Force load immediately (bypass viewport detection)
   * Used for mobile swipe view where loading is based on scroll index, not viewport
   */
  forceLoad?: boolean
}

export default function LazyImage({ src, alt, className = '', loading = 'lazy', onError, preloadDistance, forceLoad }: LazyImageProps) {
  // Default preload distance (only used when loading is lazy and not forceLoad)
  const effectivePreloadDistance = preloadDistance ?? 1.5
  const [hasError, setHasError] = useState(false)
  // For eager/forceLoad: load immediately (SSR and client both render image)
  // For lazy: start with false, use placeholder to ensure SSR/client match
  const shouldLoadImmediately = loading === 'eager' || forceLoad === true
  const [shouldLoad, setShouldLoad] = useState(shouldLoadImmediately)
  const [isMounted, setIsMounted] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Track mount state to ensure hydration consistency for lazy loading
  useEffect(() => {
    setIsMounted(true)
    // For eager/forceLoad, shouldLoad is already true from initial state
    // For lazy loading, we'll set it up in the next useEffect
  }, [])

  useEffect(() => {
    // Skip if already set to load (eager/forceLoad) or already loading
    if (shouldLoadImmediately || shouldLoad) {
      return
    }

    // Only set up observer after mount to avoid hydration issues
    if (!isMounted) {
      return
    }

    // Use Intersection Observer for lazy loading with preload distance
    // Convert viewport height to pixels for rootMargin
    const getRootMargin = () => {
      if (typeof window === 'undefined') {
        return '0px'
      }
      const vh = window.innerHeight
      const pixels = Math.round(vh * effectivePreloadDistance)
      return `${pixels}px`
    }

    const element = containerRef.current
    if (!element) {
      return
    }

    // Check if element is already in viewport (for immediate load)
    const checkInViewport = () => {
      const rect = element.getBoundingClientRect()
      const vh = typeof window !== 'undefined' ? window.innerHeight : 0
      const preloadPx = vh * effectivePreloadDistance

      // Check if element is within preload distance
      const isNearViewport = rect.top < vh + preloadPx && rect.bottom > -preloadPx
      if (isNearViewport) {
        setShouldLoad(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkInViewport()) {
      return
    }

    // Set up Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Start loading when element is within preloadDistance viewport heights
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        // Root margin extends the intersection area by preloadDistance viewport heights
        // This triggers loading before the element actually enters the viewport
        rootMargin: getRootMargin(),
        threshold: 0,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [loading, effectivePreloadDistance, shouldLoad, forceLoad, isMounted, shouldLoadImmediately])

  // For eager/forceLoad: show image immediately (SSR and client match)
  // For lazy: show placeholder until shouldLoad is true (after mount)
  const showImage = shouldLoadImmediately ? shouldLoad : isMounted && shouldLoad

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageIcon size={48} className="text-gray-400" />
        </div>
      ) : showImage ? (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={className}
          loading={loading === 'eager' ? 'eager' : 'lazy'}
          onError={(e) => {
            setHasError(true)
            if (onError) {
              onError(e)
            }
          }}
        />
      ) : (
        // Placeholder while waiting to load (ensures SSR/client match)
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}
