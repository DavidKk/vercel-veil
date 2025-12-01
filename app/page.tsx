import { LogIn } from 'feather-icons-react'
import Link from 'next/link'

import { generate } from '@/components/Meta'

const { generateMetadata } = generate({
  title: 'Vercel Veil - Webhook Gateway & Email Notifications',
  description: 'A lightweight gateway service for processing Sonarr/Radarr webhooks and sending beautifully formatted email notifications via Resend.',
})

export { generateMetadata }

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-64px-60px)] items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200 sm:p-12">
          {/* Title */}
          <div className="mb-6 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Veil</h1>
          </div>

          {/* Description */}
          <div className="mb-8 text-center">
            <p className="text-base leading-relaxed text-gray-700">
              A lightweight gateway service that consolidates private service integrations, including webhook processing, email notifications, and feed conversion. Provides secure
              API endpoints with token-based authentication.
            </p>
          </div>

          {/* Features List */}
          <div className="mb-8 border-t border-gray-200 pt-6">
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <Check size={20} className="flex-shrink-0 text-indigo-600" />
                <span>Webhook processing for Sonarr/Radarr with email notifications</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={20} className="flex-shrink-0 text-indigo-600" />
                <span>Customizable HTML email templates with preview</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={20} className="flex-shrink-0 text-indigo-600" />
                <span>Douban RSS feed conversion for Sonarr/Radarr</span>
              </li>
              <li className="flex items-center gap-2">
                <Check size={20} className="flex-shrink-0 text-indigo-600" />
                <span>Token-based authentication with 2FA support</span>
              </li>
            </ul>
          </div>

          {/* Login Button */}
          <div className="border-t border-gray-200 pt-6">
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <LogIn size={20} />
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
