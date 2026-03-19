// POST /api/v1/reports/nlq — Natural Language Query → Report Definition
// Auth: Session JWT + active tenant
// Rate limit: 20 req/min per user

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { generateReportFromNLQ } from '@/lib/ai/nlq'
import type { ApiResponse } from '@/types/insightsforge'
import type { NLQResult, DataSourceSummary } from '@/lib/ai/nlq'

const RATE_LIMIT = 20 // requests per minute
const RATE_WINDOW = 60 // seconds

const bodySchema = z.object({
  question: z.string().min(1).max(1000),
  locale: z.enum(['en', 'ar']).optional().default('en'),
})

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:nlq:${userId}`
  try {
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, RATE_WINDOW)
    }
    const remaining = Math.max(0, RATE_LIMIT - current)
    return { allowed: current <= RATE_LIMIT, remaining }
  } catch {
    // If Redis is unavailable, allow the request
    return { allowed: true, remaining: RATE_LIMIT }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<NLQResult>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  // Rate limiting
  const { allowed, remaining } = await checkRateLimit(session.user.id)
  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Window': String(RATE_WINDOW),
  }

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. AI queries are limited to 20 per minute.',
        code: 'RATE_LIMITED',
      },
      { status: 429, headers: rateLimitHeaders },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400, headers: rateLimitHeaders },
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422, headers: rateLimitHeaders },
    )
  }

  const { question, locale } = parsed.data

  // Fetch all active data sources for the tenant to build field catalogue
  const rawDataSources = await prisma.ifDataSource.findMany({
    where: { tenantId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      type: true,
      schema: true,
    },
  })

  // Build DataSourceSummary with table/column information
  const dataSources: DataSourceSummary[] = rawDataSources.map((ds) => {
    const schema = ds.schema as {
      tables?: Array<{
        name: string
        columns: Array<{ name: string; type: string; description?: string }>
      }>
    } | null

    return {
      id: ds.id,
      name: ds.name,
      type: ds.type,
      tables: schema?.tables ?? [],
    }
  })

  try {
    const result = await generateReportFromNLQ(question, dataSources, locale)
    return NextResponse.json(
      { success: true, data: result },
      { headers: rateLimitHeaders },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI generation failed'
    return NextResponse.json(
      { success: false, error: message, code: 'AI_ERROR' },
      { status: 500, headers: rateLimitHeaders },
    )
  }
}
