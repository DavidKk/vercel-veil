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
