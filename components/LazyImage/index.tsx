'use client'

import { useState } from 'react'

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

export default function LazyImage({ src, alt, className = '', loading = 'lazy', forceLoad, placeholderProps, ...props }: LazyImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  // Use native loading="lazy" with content-visibility for efficient lazy loading
  const effectiveLoading = forceLoad ? 'eager' : loading

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleRetry = () => {
    setHasError(false)
    setIsLoading(true)
    setRetryKey((prev) => prev + 1)
  }

  return (
    <div className="relative w-full h-full" style={{ contentVisibility: forceLoad ? 'visible' : 'auto' }}>
      {/* Spinner - always rendered, controlled by opacity */}
      <div
        className="absolute inset-0 bg-gray-200 flex items-center justify-center z-10"
        style={{
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
          pointerEvents: isLoading ? 'auto' : 'none',
        }}
      >
        <Spinner color="text-indigo-600" size="h-6 w-6" />
      </div>

      {/* Error placeholder - shown when image fails to load */}
      {hasError && (
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

      {/* Image - always rendered, controlled by opacity */}
      <img
        key={retryKey}
        src={src}
        alt={alt}
        className={className}
        loading={effectiveLoading}
        onLoad={() => {
          setIsLoading(false)
          setHasError(false)
        }}
        onError={handleError}
        style={{
          opacity: isLoading || hasError ? 0 : 1,
          transition: 'opacity 0.3s ease-in',
        }}
        {...props}
      />
    </div>
  )
}
