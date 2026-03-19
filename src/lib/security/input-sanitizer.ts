/**
 * Input sanitization helpers.
 * Use these before displaying user-supplied text in HTML or storing in DB.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

/** Escape HTML special characters to prevent XSS. */
export function escapeHtml(raw: string): string {
  return raw.replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] ?? ch)
}

/**
 * Strip all HTML tags from a string.
 * Useful for plain-text fields that should never contain markup.
 */
export function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, '')
}

/**
 * Normalise a slug: lowercase, only alphanumeric and hyphens, max 64 chars.
 */
export function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

/**
 * Truncate a string to a maximum byte length (UTF-8 safe approximation).
 * Prevents oversized payloads from reaching the DB.
 */
export function truncate(raw: string, maxLength: number): string {
  if (raw.length <= maxLength) return raw
  return raw.slice(0, maxLength)
}

/**
 * Validate that a string is a safe URL (http/https only).
 * Returns null if the URL is not safe.
 */
export function sanitizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Remove null bytes and control characters from a string.
 * Prevents null-byte injection and unexpected control-char issues.
 */
export function sanitizeControlChars(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

/**
 * Sanitize an arbitrary user-supplied string for safe storage.
 * Combines stripHtml + sanitizeControlChars + truncate(4096).
 */
export function sanitizeUserInput(raw: unknown, maxLength = 4096): string {
  if (typeof raw !== 'string') return ''
  return sanitizeControlChars(stripHtml(raw)).slice(0, maxLength)
}
