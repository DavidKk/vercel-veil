import type { Metadata } from 'next'

import AnimeFooter from './components/AnimeFooter'
import AnimeHeader from './components/AnimeHeader'

export const metadata: Metadata = {
  title: 'Anime Recommendations | Vercel Veil',
  description: 'Discover quality anime from AniList and TMDB',
}

interface AnimeLayoutProps {
  children: React.ReactNode
}

export default function AnimeLayout({ children }: AnimeLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* Vibrant solid color accents - Anime style */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Solid color accents */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-pink-200 to-transparent" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full blur-3xl opacity-30" />
        <div className="absolute top-1/2 left-0 w-96 h-96 bg-indigo-200 rounded-full blur-3xl opacity-20" />
      </div>

      {/* Anime Module Header */}
      <AnimeHeader />

      {/* Content with backdrop blur effect */}
      <div className="relative z-10 flex-1">{children}</div>

      {/* Anime Module Footer */}
      <AnimeFooter />
    </div>
  )
}
