import type { NextRequest } from 'next/server'

/**
 * Get base URL for the application
 * Priority:
 * 1. Request origin (if provided and not localhost/127.0.0.1)
 * 2. VERCEL_URL environment variable (for localhost/127.0.0.1 or when request is not available)
 * 3. Request origin (fallback)
 *
 * @param req Next.js request object (optional, for server-side usage)
 * @returns Base URL (e.g., "https://example.com")
 */
export function getBaseUrl(req?: NextRequest): string {
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
