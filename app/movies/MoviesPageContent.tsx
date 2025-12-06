'use client'

interface MoviesPageContentProps {
  children: React.ReactNode
}

export default function MoviesPageContent({ children }: MoviesPageContentProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8 pt-4">
        {/* Movie List */}
        {children}
      </div>
    </div>
  )
}
