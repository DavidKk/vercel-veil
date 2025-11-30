'use client'

import { useEffect, useState } from 'react'

export function useIsMobile(initialValue = false) {
  const [isMobile, setIsMobile] = useState(initialValue)

  useEffect(() => {
    function detectMobile() {
      let mobile = false

      // Screen width detection
      const width = window.innerWidth
      if (width < 1024) {
        mobile = true
      }

      // Touch Events detection
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      if (isTouchDevice && width < 1200) {
        mobile = true
      }

      setIsMobile(mobile)
    }

    detectMobile()

    window.addEventListener('resize', detectMobile)
    return () => window.removeEventListener('resize', detectMobile)
  }, [])

  return isMobile
}
