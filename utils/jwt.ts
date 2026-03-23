import type * as Jose from 'jose'

type JoseModule = typeof Jose

let joseModulePromise: Promise<JoseModule> | null = null

async function getJoseModule(): Promise<JoseModule> {
  if (!joseModulePromise) {
    joseModulePromise = import('jose')
  }
  return joseModulePromise
}

/**
 * Generate a JWT token for authenticated user sessions.
 * @param payload JWT payload object
 * @returns Promise that resolves to the signed JWT token string
 */
export async function generateToken(payload: Jose.JWTPayload): Promise<string> {
  const { secretKey, JWT_EXPIRES_IN } = getJWTConfigWithKey()
  const { SignJWT } = await getJoseModule()
  const expiresIn = /^\d+$/.test(JWT_EXPIRES_IN) ? Number(JWT_EXPIRES_IN) : JWT_EXPIRES_IN

  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setExpirationTime(expiresIn).sign(secretKey)
}

/**
 * Verify a JWT token and return its payload if valid.
 * @param token JWT token string
 * @returns Promise that resolves to the decoded payload or null if invalid
 */
export async function verifyToken(token: string): Promise<Jose.JWTPayload | null> {
  try {
    const { jwtVerify } = await getJoseModule()
    const secretKey = getJWTSecretKey()
    const { payload } = await jwtVerify(token, secretKey)
    return payload
  } catch {
    return null
  }
}

/**
 * Generate a share token with customizable type and expiration.
 * @param type Token type (e.g., 'movie-share')
 * @param expiresIn Expiration time (default: '1d'), supports numeric seconds or string formats like "1d", "2h", etc.
 * @param additionalPayload Additional payload fields to include in the token
 * @returns Promise that resolves to the signed share token string
 */
export async function generateShareToken(type: string, expiresIn: string | number = '1d', additionalPayload: Record<string, any> = {}): Promise<string> {
  const { SignJWT } = await getJoseModule()
  const secretKey = getJWTSecretKey()
  const payload: Jose.JWTPayload = {
    type,
    timestamp: Date.now(),
    ...additionalPayload,
  }

  const expiresInValue = typeof expiresIn === 'number' ? expiresIn : expiresIn

  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256', typ: 'JWT' }).setExpirationTime(expiresInValue).sign(secretKey)
}

function getJWTConfig() {
  const JWT_SECRET = process.env.JWT_SECRET
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d'

  if (!JWT_SECRET) {
    throw new Error('process.env.JWT_SECRET is not defined')
  }

  return {
    JWT_SECRET,
    JWT_EXPIRES_IN,
  }
}

function getJWTSecretKey(): Uint8Array {
  const { JWT_SECRET } = getJWTConfig()
  return new TextEncoder().encode(JWT_SECRET)
}

function getJWTConfigWithKey(): { secretKey: Uint8Array; JWT_EXPIRES_IN: string } {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getJWTConfig()
  const secretKey = new TextEncoder().encode(JWT_SECRET)

  return {
    secretKey,
    JWT_EXPIRES_IN,
  }
}
