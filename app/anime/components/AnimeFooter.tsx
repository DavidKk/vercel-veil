'use client'

import { ExternalLink } from 'feather-icons-react'

export default function AnimeFooter() {
  return (
    <footer className="hidden lg:block w-full border-t-2 border-purple-300 bg-white shadow-md">
      <div className="mx-auto w-full max-w-7xl px-4 lg:px-6 xl:px-8">
        <div className="flex flex-col items-center justify-between gap-4 py-6 lg:flex-row">
          {/* Left Section - Description */}
          <div className="flex flex-col gap-2 text-center lg:text-left">
            <p className="text-xs text-gray-600">
              Merged <span className="font-bold text-pink-500">Trending</span> and <span className="font-bold text-purple-500">Upcoming</span> anime from AniList
            </p>
            <p className="text-xs text-gray-500">Enriched with TMDB details</p>
          </div>

          {/* Right Section - Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-end">
            <a
              href="https://anilist.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-pink-600 shadow-md hover:shadow-lg hover:scale-105"
            >
              <span>AniList</span>
              <ExternalLink size={12} />
            </a>
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-indigo-600 shadow-md hover:shadow-lg hover:scale-105"
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
