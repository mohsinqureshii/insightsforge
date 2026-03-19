import { redis } from '@/lib/redis'

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfter: number }

/**
 * Sliding-window rate limiter backed by Redis.
 *
 * Uses a sorted-set per key where each member is the request timestamp (ms).
 * Members older than `windowMs` are pruned on every check.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - windowMs
  const resetAt = now + windowMs

  try {
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, '-inf', windowStart)
    pipeline.zadd(key, now, `${now}-${Math.random()}`)
    pipeline.zcard(key)
    pipeline.pexpire(key, windowMs)
    const results = await pipeline.exec()

    const count = (results?.[2]?.[1] as number) ?? 0

    if (count > limit) {
      // Get the oldest entry to calculate retry-after
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES')
      const oldestTs = oldest[1] ? parseInt(oldest[1], 10) : now
      const retryAfter = Math.ceil((oldestTs + windowMs - now) / 1000)
      return { allowed: false, remaining: 0, resetAt, retryAfter: Math.max(1, retryAfter) }
    }

    return { allowed: true, remaining: limit - count, resetAt }
  } catch {
    // If Redis is unavailable, fail open to avoid blocking all traffic
    return { allowed: true, remaining: limit, resetAt }
  }
}

// Pre-configured limiters for common use-cases
export const RATE_LIMITS = {
  /** Public auth endpoints (login, register, forgot-password) */
  AUTH: { limit: 10, windowMs: 60_000 },
  /** General API endpoints */
  API: { limit: 100, windowMs: 60_000 },
  /** Expensive AI/NLQ endpoints */
  AI: { limit: 20, windowMs: 60_000 },
  /** Webhook ingestion */
  WEBHOOK: { limit: 500, windowMs: 60_000 },
  /** Admin endpoints */
  ADMIN: { limit: 60, windowMs: 60_000 },
} as const
