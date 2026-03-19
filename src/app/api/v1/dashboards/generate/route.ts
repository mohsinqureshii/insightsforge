// POST /api/v1/dashboards/generate — AI Dashboard Builder
// Auth: Session JWT + active tenant
// Rate limit: 10 req/min per tenant

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { generateDashboardFromPrompt } from '@/lib/ai/dashboard-builder'
import type { ApiResponse } from '@/types/insightsforge'
import type { DashboardDefinition, ReportSummary } from '@/lib/ai/dashboard-builder'

const RATE_LIMIT = 10 // requests per minute
const RATE_WINDOW = 60 // seconds

const bodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  locale: z.enum(['en', 'ar']).optional().default('en'),
})

async function checkRateLimit(tenantId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `ratelimit:dashboard_gen:${tenantId}`
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
): Promise<NextResponse<ApiResponse<{ dashboardDefinition: DashboardDefinition }>>> {
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
        error: 'Rate limit exceeded. Dashboard generation is limited to 10 per minute per tenant.',
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

  const { prompt, locale } = parsed.data

  // Fetch available reports for the tenant to give Claude context
  const rawReports = await prisma.ifReport.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      chartType: true,
    },
    orderBy: { viewCount: 'desc' },
    take: 50, // cap context to 50 most-viewed reports
  })

  const availableReports: ReportSummary[] = rawReports.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    type: r.type,
    chartType: r.chartType,
  }))

  try {
    const dashboardDefinition = await generateDashboardFromPrompt(
      prompt,
      availableReports,
      locale,
    )

    return NextResponse.json(
      { success: true, data: { dashboardDefinition } },
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
