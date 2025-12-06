import type { Metadata } from 'next'

import MoviesFooter from './components/MoviesFooter'
import MoviesHeader from './components/MoviesHeader'

export const metadata: Metadata = {
  title: 'Movie Recommendations | Vercel Veil',
  description: 'Discover quality movies from Maoyan and TMDB',
}

interface MoviesLayoutProps {
  children: React.ReactNode
}

export default function MoviesLayout({ children }: MoviesLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Animated gradient background overlay */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-purple-900/10 to-pink-900/20 animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.1),transparent_50%)]" />
      </div>

      {/* Movies Module Header */}
      <MoviesHeader />

      {/* Content with backdrop blur effect */}
      <div className="relative z-10 flex-1">{children}</div>

      {/* Movies Module Footer */}
      <MoviesFooter />
    </div>
  )
}
