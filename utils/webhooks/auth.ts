import type { NextRequest } from 'next/server'

import { jsonUnauthorized } from '@/initializer/response'
import { validateCookie } from '@/services/auth/access'

export const TOKEN_HEADER_NAME = process.env.API_TOKEN_HEADER ?? 'x-vv-token'
const TOKEN_SECRET = process.env.API_TOKEN_SECRET
const CRON_SECRET = process.env.CRON_SECRET
const API_USERNAME = process.env.API_USERNAME
const API_PASSWORD = process.env.API_PASSWORD

/**
 * Extract username and password from HTTP Basic Authentication header
 * @param req Next.js request object
 * @returns Object with username and password, or null if not present
 */
function extractBasicAuth(req: NextRequest): { username: string; password: string } | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null
  }

  try {
    const base64Credentials = authHeader.substring(6)
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
    const [username, password] = credentials.split(':')
    return { username, password }
  } catch {
    return null
  }
}

/**
 * Verify username and password
 * @param username Username to verify
 * @param password Password to verify
 * @returns true if credentials match
 */
function verifyCredentials(username: string, password: string): boolean {
  if (!API_USERNAME || !API_PASSWORD) {
    return false
  }
  return username === API_USERNAME && password === API_PASSWORD
}

/**
 * Ensure authorization via cookie (for internal API calls)
 * @returns true if authenticated via cookie
 */
async function checkCookieAuth(): Promise<boolean> {
  try {
    return await validateCookie()
  } catch {
    return false
  }
}

/**
 * Ensure authorization via header token
 * @param req Next.js request object
 * @returns true if authenticated via header token
 */
function checkTokenAuth(req: NextRequest): boolean {
  if (!TOKEN_SECRET) {
    return false
  }

  const token = getHeader(req.headers, TOKEN_HEADER_NAME)
  return token === TOKEN_SECRET
}

/**
 * Ensure authorization via Basic Auth (username/password)
 * @param req Next.js request object
 * @returns true if authenticated via Basic Auth
 */
function checkBasicAuth(req: NextRequest): boolean {
  const credentials = extractBasicAuth(req)
  if (!credentials) {
    return false
  }
  return verifyCredentials(credentials.username, credentials.password)
}

/**
 * Ensure authorization for API routes
 * Supports: Cookie, Header Token, or Basic Auth (username/password)
 * @param req Next.js request object
 */
export async function ensureApiAuthorized(req: NextRequest) {
  // Check cookie authentication (for internal test pages)
  if (await checkCookieAuth()) {
    return
  }

  // Check header token authentication
  if (checkTokenAuth(req)) {
    return
  }

  // Check Basic Auth (username/password)
  if (checkBasicAuth(req)) {
    return
  }

  throw jsonUnauthorized('authentication required')
}

/**
 * Ensure authorization for webhooks that require header token + username/password
 * Supports: Cookie, or Header Token + Basic Auth (both required if token is configured)
 * @param req Next.js request object
 */
export async function ensureWebhookAuthorized(req: NextRequest) {
  // Check cookie authentication (for internal test pages)
  if (await checkCookieAuth()) {
    return
  }

  // Check Basic Auth (username/password) - required
  if (!checkBasicAuth(req)) {
    throw jsonUnauthorized('username and password required')
  }

  // If token is configured, it must also be provided
  if (TOKEN_SECRET && !checkTokenAuth(req)) {
    throw jsonUnauthorized('header token required')
  }
}

/**
 * Ensure authorization for Prowlarr webhook (only username/password, no token required)
 * Supports: Cookie, or Basic Auth (username/password)
 * @param req Next.js request object
 */
export async function ensureProwlarrAuthorized(req: NextRequest) {
  // Check cookie authentication (for internal test pages)
  if (await checkCookieAuth()) {
    return
  }

  // Check Basic Auth (username/password) - required
  if (!checkBasicAuth(req)) {
    throw jsonUnauthorized('username and password required')
  }
}

/**
 * Check authorization via CRON_SECRET (Bearer token)
 * @param req Next.js request object
 * @returns true if authenticated via CRON_SECRET
 */
function checkCronSecretAuth(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    return false
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  return token === CRON_SECRET
}

/**
 * Ensure authorization for cron jobs
 * Only supports CRON_SECRET (Bearer token) authentication
 * @param req Next.js request object
 */
export async function ensureCronAuthorized(req: NextRequest) {
  // Check CRON_SECRET authentication (Bearer token) - required
  if (!checkCronSecretAuth(req)) {
    throw jsonUnauthorized('CRON_SECRET authentication required')
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use ensureApiAuthorized, ensureWebhookAuthorized, or ensureProwlarrAuthorized instead
 */
export function ensureAuthorized(req: NextRequest) {
  if (!TOKEN_SECRET) {
    throw new Error('API_TOKEN_SECRET is not configured in environment variables')
  }

  const token = getHeader(req.headers, TOKEN_HEADER_NAME)
  if (!token || token !== TOKEN_SECRET) {
    throw jsonUnauthorized('token mismatch')
  }
}

export function getHeader(headers: Headers, name: string): string | null {
  const normalized = name.toLowerCase()
  return headers.get(name) ?? headers.get(normalized) ?? headers.get(normalized.toUpperCase())
}
