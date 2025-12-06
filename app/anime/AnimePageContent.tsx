'use client'

interface AnimePageContentProps {
  children: React.ReactNode
}

export default function AnimePageContent({ children }: AnimePageContentProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8 pt-4 pb-8 lg:pb-12">
        {/* Anime List */}
        {children}
      </div>
    </div>
  )
}
