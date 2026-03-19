// POST /api/v1/reports/:id/insights — AI Insight Narrative
// Auth: Session JWT + active tenant
// Rate limit: 30 req/min per tenant

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { generateInsightNarrative } from '@/lib/ai/insights'
import type { ApiResponse } from '@/types/insightsforge'
import type { InsightNarrativeResult } from '@/lib/ai/insights'

const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60 // seconds

const bodySchema = z.object({
  rows: z.array(z.unknown()),
  columns: z.array(z.unknown()),
  locale: z.enum(['en', 'ar']).optional().default('en'),
})

type Params = { params: { id: string } }

async function checkRateLimit(tenantId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:insights:${tenantId}`
  try {
    const current = await redis.incr(key)
    if (current === 1) {
      await redis.expire(key, RATE_WINDOW)
    }
    const remaining = Math.max(0, RATE_LIMIT - current)
    return { allowed: current <= RATE_LIMIT, remaining }
  } catch {
    return { allowed: true, remaining: RATE_LIMIT }
  }
}

export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<InsightNarrativeResult>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  // Rate limiting per tenant
  const { allowed, remaining } = await checkRateLimit(tenantId)
  const rateLimitHeaders = {
    'X-RateLimit-Limit': String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Window': String(RATE_WINDOW),
  }

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. AI insights are limited to 30 per minute per tenant.',
        code: 'RATE_LIMITED',
      },
      { status: 429, headers: rateLimitHeaders },
    )
  }

  // Verify the report belongs to this tenant
  const report = await prisma.ifReport.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    select: { id: true, name: true },
  })

  if (!report) {
    return NextResponse.json(
      { success: false, error: 'Report not found' },
      { status: 404, headers: rateLimitHeaders },
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

  const { rows, columns, locale } = parsed.data

  try {
    const result = await generateInsightNarrative(rows, columns, {
      reportName: report.name,
      rowCount: rows.length,
    }, locale)

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
