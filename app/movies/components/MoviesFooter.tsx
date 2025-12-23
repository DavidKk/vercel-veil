'use client'

import { ExternalLink } from 'feather-icons-react'

export default function MoviesFooter() {
  return (
    <footer className="hidden lg:block w-full border-t border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8">
        <div className="flex flex-col items-center justify-between gap-4 py-6 lg:flex-row">
          {/* Left Section - Description */}
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <p className="text-xs text-gray-400">
              Merged <span className="font-medium text-white">Top Rated</span> and <span className="font-medium text-white">Most Expected</span> lists from Maoyan
            </p>
            <p className="text-xs text-gray-500">Enriched with TMDB details</p>
          </div>

          {/* Right Section - Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-end">
            <a
              href="https://maoyan.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/10 border border-white/10"
            >
              <span>Maoyan</span>
              <ExternalLink size={12} />
            </a>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-white/10 border border-white/10"
            >
              <span>TMDB</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
