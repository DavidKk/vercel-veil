import { createHash } from 'crypto'

export function hashToken(password: string, salt: string = generateSalt()) {
  const msg = password + salt
  const hashHex = createHash('md5').update(msg, 'utf8').digest('hex')
  return { salt, hashHex }
}

export function generateSalt(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let salt = ''
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length))
  }

  return salt
}
