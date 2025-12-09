import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { ensureCronAuthorized } from '@/services/auth/api'
import { getHeaders, runWithContext } from '@/services/context'
import { fail } from '@/services/logger'

import { isStandardResponse, standardResponseError, stringifyUnknownError } from './response'

export interface Context {
  params: Promise<any>
}

export interface ContextWithParams<P> extends Context {
  params: Promise<P>
}

export function api<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<Record<string, any>>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
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
      } catch (err) {
        if (err instanceof NextResponse) {
          return err
        }

        const errorMessage = stringifyUnknownError(err)
        fail(`API handler error: ${errorMessage}`)

        const result = (() => {
          if (isStandardResponse(err)) {
            return err
          }

          return standardResponseError(errorMessage)
        })()

        return NextResponse.json(result, { status: 500 })
      }
    })
  }
}

export function plainText<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<string | NextResponse>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    return runWithContext(req, async () => {
      try {
        const result = await handle(req, context)
        const headers = getHeaders()
        if (result instanceof NextResponse) {
          return result
        }

        return new NextResponse(result, { status: 200, headers })
      } catch (err) {
        const message = stringifyUnknownError(err)
        fail(`PlainText handler error: ${message}`)
        return new NextResponse(message, { status: 500 })
      }
    })
  }
}

export function buffer<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<ArrayBuffer | NextResponse>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    return runWithContext(req, async () => {
      try {
        const result = await handle(req, context)
        const headers = getHeaders()
        if (result instanceof NextResponse) {
          return result
        }
        return new NextResponse(result, { status: 200, headers })
      } catch (err) {
        const message = stringifyUnknownError(err)
        fail(`PlainText handler error: ${message}`)
        return new NextResponse(message, { status: 500 })
      }
    })
  }
}

/**
 * XML response handler wrapper
 * Handles XML string responses and sets appropriate Content-Type header
 * @param handle Handler function that returns XML string or NextResponse
 * @returns Next.js route handler
 */
export function xml<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<string | NextResponse>) {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    return runWithContext(req, async () => {
      try {
        const result = await handle(req, context)
        if (result instanceof NextResponse) {
          return result
        }

        // At this point, result must be a string (XML content)
        const xmlString = result
        const collectHeaders = getHeaders()

        // Convert Headers to plain object if needed, similar to api() function
        const headersObj: Record<string, string> = {}
        if (collectHeaders) {
          collectHeaders.forEach((value, key) => {
            headersObj[key] = value
          })
        }

        // Set XML content type header
        headersObj['Content-Type'] = 'application/xml; charset=UTF-8'

        return new NextResponse(xmlString, { status: 200, headers: headersObj })
      } catch (err) {
        if (err instanceof NextResponse) {
          return err
        }

        const message = stringifyUnknownError(err)
        fail(`XML handler error: ${message}`)
        return new NextResponse(message, { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
      }
    })
  }
}

/**
 * Cron job handler wrapper
 * Supports CRON_SECRET (Bearer token) or webhook authentication (API_SECRET + Basic Auth)
 * Internally uses `api` to avoid code duplication
 * @param handle Handler function that processes the cron job
 * @returns Next.js route handler
 */
export function cron<P>(handle: (req: NextRequest, context: ContextWithParams<P>) => Promise<Record<string, any>>) {
  return api(async (req: NextRequest, context: ContextWithParams<P>) => {
    // Support CRON_SECRET (Bearer token) or webhook authentication
    await ensureCronAuthorized(req)

    return handle(req, context)
  })
}
