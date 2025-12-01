import type { NextRequest } from 'next/server'

/**
 * Get base URL for the application
 * Priority:
 * 1. Custom domain from APP_BASE_URL environment variable (if set)
 * 2. Request origin (if not localhost/127.0.0.1)
 * 3. VERCEL_URL environment variable (for localhost/127.0.0.1)
 * 4. Request origin (fallback)
 *
 * @param req Next.js request object (optional, for server-side usage)
 * @returns Base URL (e.g., "https://example.com")
 */
export function getBaseUrl(req?: NextRequest): string {
  // Priority 1: Custom domain from environment variable
  const appBaseUrl = process.env.APP_BASE_URL
  if (appBaseUrl) {
    // Ensure it has protocol
    if (appBaseUrl.startsWith('http://') || appBaseUrl.startsWith('https://')) {
      return appBaseUrl.replace(/\/$/, '') // Remove trailing slash
    }
    return `https://${appBaseUrl.replace(/\/$/, '')}`
  }

  // If request is provided, use it to determine origin
  if (req) {
    const url = new URL(req.url)
    const origin = url.origin

    // If origin is localhost or 127.0.0.1, try to use VERCEL_URL
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      const vercelUrl = process.env.VERCEL_URL
      if (vercelUrl) {
        return `https://${vercelUrl}`
      }
    }

    return origin
  }

  // Fallback: try VERCEL_URL
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }

  // Last resort: return a default (should not happen in production)
  return 'https://localhost:3000'
}
