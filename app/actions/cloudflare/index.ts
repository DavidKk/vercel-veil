'use server'

import { validateCookie } from '@/services/auth/access'
import { checkCloudflareBlocked, checkServiceBlocked } from '@/services/cloudflare'
import type { CloudflareCheckResult } from '@/services/cloudflare/types'
import { fail } from '@/services/logger'

export interface CheckCloudflareOptions {
  url: string
  service?: 'navidrome' | 'radarr'
  cfAccessClientId?: string
  cfAccessClientSecret?: string
}

/**
 * Check if a URL is blocked by Cloudflare (Server Action)
 * @param options Check options
 * @returns Cloudflare check result
 */
export async function checkCloudflare(options: CheckCloudflareOptions): Promise<CloudflareCheckResult> {
  // Authentication
  if (!(await validateCookie())) {
    fail('Unauthorized access to Cloudflare check')
    throw new Error('Unauthorized')
  }

  const { url, service, cfAccessClientId, cfAccessClientSecret } = options

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    fail('Invalid URL parameter for Cloudflare check')
    throw new Error('URL parameter is required and must be a non-empty string')
  }

  // Build custom headers for Cloudflare Access
  const customHeaders: Record<string, string> = {}
  if (cfAccessClientId && cfAccessClientId.trim()) {
    customHeaders['CF-Access-Client-Id'] = cfAccessClientId.trim()
  }
  if (cfAccessClientSecret && cfAccessClientSecret.trim()) {
    customHeaders['CF-Access-Client-Secret'] = cfAccessClientSecret.trim()
  }

  try {
    let result: CloudflareCheckResult

    // If service is specified, use checkServiceBlocked
    if (service === 'navidrome' || service === 'radarr') {
      result = await checkServiceBlocked(url.trim(), {
        method: 'GET',
        checkBody: true,
        headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
      })
    } else {
      // Otherwise use general checkCloudflareBlocked
      result = await checkCloudflareBlocked(url.trim(), {
        method: 'GET',
        checkBody: true,
        headers: Object.keys(customHeaders).length > 0 ? customHeaders : undefined,
      })
    }

    return result
  } catch (error) {
    fail('Cloudflare check failed', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}
