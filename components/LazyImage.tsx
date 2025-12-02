'use client'

import { Image as ImageIcon } from 'feather-icons-react'
import { useState } from 'react'

import { Spinner } from './Spinner'

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /**
   * Force load immediately (bypass lazy loading)
   * Used for mobile swipe view where loading is based on scroll index, not viewport
   */
  forceLoad?: boolean
}

export default function LazyImage({ src, alt, className = '', loading = 'lazy', onError, forceLoad, ...props }: LazyImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Use native loading="lazy" with content-visibility for efficient lazy loading
  const effectiveLoading = forceLoad ? 'eager' : loading

  // Default placeholder SVG for error state
  const placeholderSvg =
    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 300"%3E%3Crect fill="%23e5e7eb" width="200" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3ENo Image%3C/text%3E%3C/svg%3E'

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false)
    setHasError(true)
    // Set placeholder image as fallback
    const target = e.target as HTMLImageElement
    target.src = placeholderSvg
    // Call custom onError if provided
    if (onError) {
      onError(e)
    }
  }

  return (
    <div className="relative w-full h-full" style={{ contentVisibility: forceLoad ? 'visible' : 'auto' }}>
      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <ImageIcon size={48} className="text-gray-400" />
        </div>
      ) : (
        <>
          {/* Spinner shown while image is loading */}
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10">
              <Spinner color="text-indigo-600" size="h-6 w-6" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={className}
            loading={effectiveLoading}
            onLoad={() => setIsLoading(false)}
            onError={handleError}
            style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s' }}
            {...props}
          />
        </>
      )}
    </div>
  )
}
