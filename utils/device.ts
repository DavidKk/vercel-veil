import { headers } from 'next/headers'

/**
 * Detect if the request is from a mobile device (Server Component)
 * Uses User-Agent header to detect mobile devices
 */
export async function isMobileDevice(): Promise<boolean> {
  const headersList = await headers()
  const userAgent = headersList.get('user-agent') || ''

  // Mobile device patterns
  const mobilePatterns = [/Android/i, /webOS/i, /iPhone/i, /iPad/i, /iPod/i, /BlackBerry/i, /Windows Phone/i, /Mobile/i]

  return mobilePatterns.some((pattern) => pattern.test(userAgent))
}
