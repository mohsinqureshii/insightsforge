import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: iv:authTag:ciphertext (all hex-encoded).
 * The key must be a 64-character hex string (32 bytes).
 */
export function encrypt(text: string, key: string): string {
  if (!key || key.length !== 64) {
    throw new Error('Encryption key must be a 64-character hex string (32 bytes)')
  }
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

/**
 * Decrypt a string encrypted with encrypt().
 * The key must be a 64-character hex string (32 bytes).
 */
export function decrypt(encryptedText: string, key: string): string {
  if (!key || key.length !== 64) {
    throw new Error('Encryption key must be a 64-character hex string (32 bytes)')
  }
  const parts = encryptedText.split(':')
  if (parts.length < 3) {
    throw new Error('Invalid encrypted text format')
  }
  const [ivHex, authTagHex, ...rest] = parts
  const encrypted = rest.join(':') // Handle case where ciphertext itself contains colons
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

/**
 * Convenience: encrypt using the CONNECTOR_ENCRYPTION_KEY env var.
 */
export function encryptCredential(text: string): string {
  const key = getEncryptionKey()
  return encrypt(text, key)
}

/**
 * Convenience: decrypt using the CONNECTOR_ENCRYPTION_KEY env var.
 */
export function decryptCredential(encryptedText: string): string {
  const key = getEncryptionKey()
  return decrypt(encryptedText, key)
}

function getEncryptionKey(): string {
  const key = process.env.CONNECTOR_ENCRYPTION_KEY ?? process.env.ENCRYPTION_KEY ?? ''
  if (!key) {
    throw new Error(
      'CONNECTOR_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: openssl rand -hex 32',
    )
  }
  // Pad or truncate to 64 hex chars (32 bytes)
  if (key.length === 64 && /^[0-9a-f]+$/i.test(key)) {
    return key
  }
  // Derive a 32-byte key from the provided secret using SHA-256
  return crypto.createHash('sha256').update(key).digest('hex')
}
