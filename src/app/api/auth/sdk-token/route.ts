// POST /api/auth/sdk-token
// Called by the @insightforge/sdk during init() to exchange an API key for a
// short-lived JWT that is embedded in iframe URLs for SDK-mode authentication.
//
// The API key must have the 'sdk' scope and must not be revoked or expired.
// Returns: { token: string, expiresAt: string }

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashApiKey, signJwt } from '@/lib/auth-utils'
import { redis } from '@/lib/redis'
import { checkRateLimit } from '@/lib/auth-utils'
import type { ApiResponse } from '@/types/insightsforge'

const SDK_TOKEN_TTL_SECONDS = 3600 // 1 hour

const sdkTokenBodySchema = z.object({
  tenantId: z.string().min(1),
  userId: z.string().min(1),
  userRole: z.enum(['tenant_admin', 'analytics_admin', 'builder', 'viewer', 'api_user']),
  dataFilters: z.record(z.union([z.string(), z.array(z.string()), z.number(), z.boolean()])).optional(),
  locale: z.enum(['en', 'ar']).default('en'),
})

type SdkTokenResponse = {
  token: string
  expiresAt: string
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<SdkTokenResponse>>> {
  // Rate limit: 60 requests per IP per minute to prevent key probing
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rateLimit = await checkRateLimit(redis, `sdk-token:${ip}`, 60, 60)

  const response = NextResponse.json(
    { success: false, error: 'Too many requests' },
    { status: 429 },
  )
  response.headers.set('X-RateLimit-Limit', '60')
  response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)))

  if (!rateLimit.allowed) {
    return response
  }

  // Validate the API key from the Authorization header
  const apiKeyHeader = req.headers.get('x-api-key')
  if (!apiKeyHeader) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'MISSING_API_KEY' },
      { status: 401 },
    )
  }

  // Hash the provided key for lookup (keys are stored hashed)
  const keyHash = hashApiKey(apiKeyHeader)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', code: 'INVALID_BODY' },
      { status: 400 },
    )
  }

  const parsed = sdkTokenBodySchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return NextResponse.json(
      {
        success: false,
        error: firstError?.message ?? 'Validation failed',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
    )
  }

  const { tenantId, userId, userRole, dataFilters, locale } = parsed.data

  // Look up the API key by hash, scoped to the tenant
  const apiKey = await prisma.ifApiKey.findFirst({
    where: {
      keyHash,
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
      tenantId: true,
      scopes: true,
      expiresAt: true,
    },
  })

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Invalid or revoked API key', code: 'INVALID_API_KEY' },
      { status: 401 },
    )
  }

  // Check if the key has expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return NextResponse.json(
      { success: false, error: 'API key has expired', code: 'API_KEY_EXPIRED' },
      { status: 401 },
    )
  }

  // Verify the API key has the 'sdk' scope
  const scopes = Array.isArray(apiKey.scopes) ? (apiKey.scopes as string[]) : []
  if (!scopes.includes('sdk')) {
    return NextResponse.json(
      { success: false, error: 'API key does not have sdk scope', code: 'INSUFFICIENT_SCOPE' },
      { status: 403 },
    )
  }

  // Ensure the tenantId in the body matches the key's tenant (prevent cross-tenant abuse)
  if (apiKey.tenantId !== tenantId) {
    return NextResponse.json(
      { success: false, error: 'Tenant mismatch', code: 'TENANT_MISMATCH' },
      { status: 403 },
    )
  }

  // Update lastUsedAt asynchronously — do not await so it doesn't block the response
  prisma.ifApiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Non-critical — ignore errors
    })

  // Generate the short-lived SDK JWT
  const now = Math.floor(Date.now() / 1000)
  const exp = now + SDK_TOKEN_TTL_SECONDS

  const token = signJwt(
    {
      sub: userId,
      tenantId,
      role: userRole,
      dataFilters: dataFilters ?? {},
      locale,
      iss: 'insightforge-sdk',
      iat: now,
      exp,
    },
    SDK_TOKEN_TTL_SECONDS,
  )

  const expiresAt = new Date(exp * 1000).toISOString()

  const successResponse = NextResponse.json<ApiResponse<SdkTokenResponse>>(
    { success: true, data: { token, expiresAt } },
    { status: 200 },
  )

  successResponse.headers.set('X-RateLimit-Limit', '60')
  successResponse.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
  successResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetAt / 1000)))

  return successResponse
}
