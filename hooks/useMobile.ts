'use client'

import { useEffect, useState } from 'react'

export function useIsMobile(initialValue = false) {
  const [isMobile, setIsMobile] = useState(initialValue)

  useEffect(() => {
    function detectMobile() {
      // Only use screen width to determine mobile (phone only, not tablet)
      // Mobile (phone): < 1024px - use swipe view
      // Tablet/PC: >= 1024px - use grid layout
      const width = window.innerWidth
      setIsMobile(width < 1024)
    }

    detectMobile()

    window.addEventListener('resize', detectMobile)
    return () => window.removeEventListener('resize', detectMobile)
  }, [])

  return isMobile
}
