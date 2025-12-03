'use client'

import { useEffect, useRef, useState } from 'react'

import { Spinner } from '../Spinner'
import PosterPlaceholder from './PosterPlaceholder'

export interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Force load immediately (bypass lazy loading)
   * Used for mobile swipe view where loading is based on scroll index, not viewport
   */
  forceLoad?: boolean
  /**
   * Custom placeholder component props for error state
   */
  placeholderProps?: {
    title?: string
    subtitle?: string
  }
}

export default function LazyImage({ src, alt, className = '', forceLoad, placeholderProps, ...props }: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [shouldLoad, setShouldLoad] = useState(forceLoad || false)
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Use IntersectionObserver to detect when image enters viewport (with expanded range)
  useEffect(() => {
    // If forceLoad is true, skip IntersectionObserver
    if (forceLoad) {
      setShouldLoad(true)
      return
    }

    const container = containerRef.current
    if (!container) return

    // Create IntersectionObserver with rootMargin to load next screen
    // 0% 0% 100% 0% = expand 100% viewport height downward (top, right, bottom, left)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            // Once loaded, we can disconnect the observer
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '0% 0% 100% 0%', // Expand loading range to include next screen (100% viewport height downward)
        threshold: 0.01, // Trigger when any part of the element is visible
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [forceLoad])

  // Reset loading state when src changes
  useEffect(() => {
    if (shouldLoad) {
      setIsLoading(true)
      setHasError(false)
    }
  }, [src, shouldLoad])

  // Check if image is already loaded (cached or loaded before onLoad fires)
  useEffect(() => {
    if (!shouldLoad) return

    // Use requestAnimationFrame to ensure DOM is ready
    const checkImageStatus = () => {
      const img = imgRef.current
      if (!img) return

      // Check if image is already complete (cached or loaded very quickly)
      if (img.complete) {
        if (img.naturalWidth > 0 && img.naturalHeight > 0) {
          // Image loaded successfully
          setIsLoading(false)
          setHasError(false)
        } else {
          // Image complete but has no dimensions - likely an error
          setIsLoading(false)
          setHasError(true)
        }
      }
    }

    // Check immediately and also on next frame to catch fast loads
    checkImageStatus()
    const rafId = requestAnimationFrame(() => {
      checkImageStatus()
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [src, retryKey, shouldLoad])

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    setRetryKey((prev) => prev + 1)
  }

  // Only set src when shouldLoad is true
  const imageSrc = shouldLoad ? src : undefined

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{ contentVisibility: forceLoad ? 'visible' : 'auto' }}>
      {/* Spinner - always rendered, controlled by opacity */}
      <div
        className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10"
        style={{
          opacity: isLoading && shouldLoad ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: isLoading && shouldLoad ? 'auto' : 'none',
        }}
      >
        <Spinner color="text-indigo-600" size="h-6 w-6" />
      </div>

      {/* Error placeholder - shown when image fails to load */}
      {hasError && shouldLoad && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleRetry}
          style={{
            opacity: hasError ? 1 : 0,
            transition: 'opacity 0.3s ease-in',
          }}
        >
          <PosterPlaceholder title={placeholderProps?.title} subtitle={placeholderProps?.subtitle || 'Click to retry'} className="w-full h-full" />
        </div>
      )}

      {/* Image - only render when shouldLoad is true */}
      {shouldLoad && (
        <img
          ref={imgRef}
          key={retryKey}
          src={imageSrc}
          alt={alt}
          className={className}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            opacity: isLoading || hasError ? 0 : 1,
            transition: 'opacity 0.2s ease-in, transform 160ms ease-in',
          }}
          {...props}
        />
      )}
    </div>
  )
}
