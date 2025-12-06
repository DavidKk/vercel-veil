import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { AssistSidebarPanel, AssistSidebarProvider, AssistSidebarRouteListener } from '@/components/AssistSidebar'

import Layout from './components/layout'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Vercel Veil',
  description: 'Lightweight gateway service for handling Sonarr/Radarr webhooks and sending email notifications via Resend',
}

export interface RootLayoutProps {
  children: React.ReactNode
}

export default function RootLayout(props: Readonly<RootLayoutProps>) {
  const { children } = props

  return (
    <html lang="en" suppressHydrationWarning>
      <Analytics />
      <SpeedInsights />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`} suppressHydrationWarning>
        <AssistSidebarProvider>
          <AssistSidebarRouteListener />
          <AssistSidebarPanel />
          <Layout>{children}</Layout>
        </AssistSidebarProvider>
      </body>
    </html>
  )
}
