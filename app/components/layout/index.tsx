import { Suspense } from 'react'

import Footer from './Footer'
import FooterWrapper from './Footer/FooterWrapper'
import { Nav } from './Nav'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <Nav />
      {children}
      <FooterWrapper>
        <Suspense fallback={null}>
          <Footer />
        </Suspense>
      </FooterWrapper>
    </>
  )
}
