import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getHeaders, runWithContext } from '@/services/context'
import { ensureWebhookAuthorized } from '@/utils/webhooks/auth'

import { isStandardResponse, standardResponseError, stringifyUnknownError } from './response'

export interface Context {
  params: Promise<any>
  searchParams: URLSearchParams
}

export interface ContextWithParams<P> extends Context {
  params: Promise<P>
}

export function api<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<Record<string, any>>) {
  return async (req: NextRequest, context: Context) => {
    return runWithContext(req, async () => {
      try {
        const result = await handle(req, context)
        if (result instanceof NextResponse) {
          return result
        }

        const status = 'status' in result ? result.status : 200
        const inputHeaders = 'headers' in result ? result.headers : {}
        const collectHeaders = getHeaders()
        const headers = { ...collectHeaders, ...inputHeaders }
        return NextResponse.json(result, { status, headers })
      } catch (error) {
        if (error instanceof NextResponse) {
          return error
        }

        const result = (() => {
          if (isStandardResponse(error)) {
            return error
          }

          const message = stringifyUnknownError(error)
          return standardResponseError(message)
        })()

        return NextResponse.json(result, { status: 500 })
      }
    })
  }
}

export function plainText<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<string | NextResponse>) {
  return async (req: NextRequest, context: ContextWithParams<P>) => {
    return runWithContext(req, async () => {
      try {
        const result = await handle(req, context)
        const headers = getHeaders()
        if (result instanceof NextResponse) {
          return result
        }

        return new NextResponse(result, { status: 200, headers })
      } catch (error) {
        const message = stringifyUnknownError(error)
        return new NextResponse(message, { status: 500 })
      }
    })
  }
}

export function buffer<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<ArrayBuffer | NextResponse>) {
  return async (req: NextRequest, context: ContextWithParams<P>) => {
    return runWithContext(req, async () => {
      try {
        const result = await handle(req, context)
        const headers = getHeaders()
        if (result instanceof NextResponse) {
          return result
        }
        return new NextResponse(result, { status: 200, headers })
      } catch (error) {
        const message = stringifyUnknownError(error)
        return new NextResponse(message, { status: 500 })
      }
    })
  }
}

/**
 * Verify if request is from Vercel Cron Job
 * Vercel cron jobs always have:
 * - User-Agent: vercel-cron/1.0
 * - Authorization: Bearer ${CRON_SECRET}
 */
function isVercelCronRequest(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent')
  const authorization = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // Check User-Agent
  if (userAgent !== 'vercel-cron/1.0') {
    return false
  }

  // If CRON_SECRET is set, verify Authorization header
  if (cronSecret) {
    const expectedAuth = `Bearer ${cronSecret}`
    if (authorization !== expectedAuth) {
      return false
    }
  }

  return true
}

/**
 * Cron job handler wrapper
 * Automatically verifies Vercel Cron Job requests or requires webhook authentication for manual calls
 * Internally uses `api` to avoid code duplication
 * @param handle Handler function that processes the cron job
 * @returns Next.js route handler
 */
export function cron<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<Record<string, any>>) {
  return api(async (req: NextRequest, context: ContextWithParams<P>) => {
    // For Vercel Cron Jobs, verify User-Agent
    if (!isVercelCronRequest(req)) {
      // For non-cron requests, require webhook authentication
      await ensureWebhookAuthorized(req)
    }

    return handle(req, context)
  })
}
