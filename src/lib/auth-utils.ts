import bcrypt from 'bcryptjs'
import { createHmac, randomBytes } from 'crypto'
import jwt from 'jsonwebtoken'
import CryptoJS from 'crypto-js'

const BCRYPT_ROUNDS = 12
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? ''

// ============================================================
// Password hashing
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  )
}

// ============================================================
// AES Encryption (for MFA secrets, DB credentials)
// ============================================================

export function encrypt(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  return CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString()
}

export function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// ============================================================
// API Key generation & hashing
// ============================================================

const API_KEY_PREFIX = 'if_live_'

export function generateApiKey(): { key: string; keyHash: string; keyPrefix: string } {
  const rawKey = randomBytes(32).toString('base64url')
  const key = `${API_KEY_PREFIX}${rawKey}`
  const keyHash = hashApiKey(key)
  const keyPrefix = key.slice(0, 12)
  return { key, keyHash, keyPrefix }
}

export function hashApiKey(key: string): string {
  return createHmac('sha256', ENCRYPTION_KEY || 'fallback')
    .update(key)
    .digest('hex')
}

// ============================================================
// Password reset tokens
// ============================================================

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

export function generatePasswordResetToken(): {
  token: string
  tokenHash: string
  expires: Date
} {
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHmac('sha256', ENCRYPTION_KEY || 'fallback')
    .update(token)
    .digest('hex')
  const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)
  return { token, tokenHash, expires }
}

export function hashResetToken(token: string): string {
  return createHmac('sha256', ENCRYPTION_KEY || 'fallback')
    .update(token)
    .digest('hex')
}

// ============================================================
// Invite tokens
// ============================================================

const INVITE_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export function generateInviteToken(): {
  token: string
  expires: Date
} {
  const token = randomBytes(24).toString('base64url')
  const expires = new Date(Date.now() + INVITE_TOKEN_EXPIRY_MS)
  return { token, expires }
}

// ============================================================
// MFA backup codes
// ============================================================

export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    randomBytes(4).toString('hex').toUpperCase(),
  )
}

// ============================================================
// JWT utilities (for API-level tokens if needed)
// ============================================================

const JWT_SECRET = process.env.NEXTAUTH_SECRET ?? 'fallback-secret'

export function signJwt(
  payload: Record<string, unknown>,
  expiresIn: string | number = '1h',
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] })
}

export function verifyJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T
  } catch {
    return null
  }
}

// ============================================================
// Rate limiting helpers (token bucket stored in Redis)
// ============================================================

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export async function checkRateLimit(
  redis: { incr: (key: string) => Promise<number>; expire: (key: string, seconds: number) => Promise<number> },
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, windowSeconds)
  }
  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt: Date.now() + windowSeconds * 1000,
  }
}
