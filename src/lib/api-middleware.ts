import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ApiResponse } from '@/types/insightsforge'

type RateLimitPreset = keyof typeof RATE_LIMITS

/**
 * Apply rate limiting to a request and return rate-limit headers.
 * Returns a 429 response if the limit is exceeded, otherwise null.
 */
export async function applyRateLimit(
  req: NextRequest,
  preset: RateLimitPreset = 'API',
  keyPrefix?: string,
): Promise<NextResponse | null> {
  // Build a per-IP + per-route key
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  const route = keyPrefix ?? req.nextUrl.pathname
  const key = `rl:${preset}:${route}:${ip}`

  const { limit, windowMs } = RATE_LIMITS[preset]
  const result = await checkRateLimit(key, limit, windowMs)

  const headers = new Headers({
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  })

  if (!result.allowed) {
    headers.set('Retry-After', String(result.retryAfter))
    const body: ApiResponse<never> = {
      success: false,
      error: 'Too many requests. Please slow down.',
    }
    return NextResponse.json(body, { status: 429, headers })
  }

  return null
}

/**
 * Require an active session. Returns 401 if not authenticated.
 */
export async function requireSession(
  _req: NextRequest,
): Promise<{ session: Awaited<ReturnType<typeof getServerSession>>; error: null } | { session: null; error: NextResponse }> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    const body: ApiResponse<never> = { success: false, error: 'Authentication required' }
    return { session: null, error: NextResponse.json(body, { status: 401 }) }
  }
  return { session, error: null }
}

/**
 * Add standard security headers to a response.
 */
export function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return res
}
