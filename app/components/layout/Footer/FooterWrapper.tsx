'use client'

import { useLayoutVisibility } from '@/hooks/useLayoutVisibility'

interface FooterWrapperProps {
  children: React.ReactNode
}

export default function FooterWrapper({ children }: FooterWrapperProps) {
  const shouldHide = useLayoutVisibility()

  if (shouldHide) {
    return null
  }

  return <>{children}</>
}
