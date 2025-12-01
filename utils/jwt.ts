import jwt from 'jsonwebtoken'

export function generateToken(payload: object) {
  const { JWT_SECRET, JWT_EXPIRES_IN } = getJWTConfig()
  // Support both numeric seconds (e.g. "86400") and string formats like "1d"
  const expiresIn = /^\d+$/.test(JWT_EXPIRES_IN) ? Number(JWT_EXPIRES_IN) : JWT_EXPIRES_IN
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any })
}

export function verifyToken(token: string) {
  try {
    const { JWT_SECRET } = getJWTConfig()
    return jwt.verify(token, JWT_SECRET)
  } catch (err) {
    return null
  }
}

/**
 * Generate a share token with customizable type and expiration
 * @param type Token type (e.g., 'movie-share')
 * @param expiresIn Expiration time (default: '1d'), supports numeric seconds or string formats like "1d", "2h", etc.
 * @param additionalPayload Additional payload fields to include in the token
 * @returns JWT token string
 */
export function generateShareToken(type: string, expiresIn: string | number = '1d', additionalPayload: Record<string, any> = {}): string {
  const { JWT_SECRET } = getJWTConfig()
  const payload = {
    type,
    timestamp: Date.now(),
    ...additionalPayload,
  }

  // Support both numeric seconds (e.g. 86400) and string formats like "1d"
  const expiresInValue = typeof expiresIn === 'number' ? expiresIn : expiresIn

  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresInValue as any })
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
