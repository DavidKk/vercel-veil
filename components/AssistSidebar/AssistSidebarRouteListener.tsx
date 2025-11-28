'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { useAssistSidebar } from './AssistSidebarContext'

/**
 * Component that listens to route changes and closes the assist sidebar
 */
export function AssistSidebarRouteListener() {
  const pathname = usePathname()
  const { closeSidebar } = useAssistSidebar()

  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  return null
}
