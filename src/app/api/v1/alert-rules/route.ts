import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/api-middleware'
import type { ApiResponse } from '@/types/insightsforge'
import type { AlertCondition, AlertSeverity, NotificationChannel } from '@prisma/client'

const CreateAlertRuleSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  reportId: z.string().cuid().optional(),
  metricField: z.string().min(1).max(120),
  condition: z.enum([
    'greater_than', 'less_than', 'equals', 'not_equals',
    'percentage_change_up', 'percentage_change_down',
  ]),
  threshold: z.number(),
  severity: z.enum(['info', 'warning', 'critical']).default('warning'),
  channels: z.array(z.enum(['in_app', 'email', 'slack'])).default(['in_app']),
  slackWebhook: z.string().url().optional(),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'API')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = req.headers.get('X-Tenant-ID')
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant context required' }, { status: 400 })
  }

  const { searchParams } = req.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10))

  const [rules, total] = await Promise.all([
    prisma.ifAlertRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        report: { select: { id: true, name: true } },
        _count: { select: { firings: true } },
      },
    }),
    prisma.ifAlertRule.count({ where: { tenantId } }),
  ])

  return NextResponse.json({ success: true, data: { rules, total, page, limit } })
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'API')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = req.headers.get('X-Tenant-ID')
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant context required' }, { status: 400 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateAlertRuleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const rule = await prisma.ifAlertRule.create({
    data: {
      tenantId,
      createdById: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      reportId: parsed.data.reportId ?? null,
      metricField: parsed.data.metricField,
      condition: parsed.data.condition as AlertCondition,
      threshold: parsed.data.threshold,
      severity: parsed.data.severity as AlertSeverity,
      channels: parsed.data.channels as NotificationChannel[],
      slackWebhook: parsed.data.slackWebhook ?? null,
      isActive: parsed.data.isActive,
    },
  })

  return NextResponse.json({ success: true, data: rule }, { status: 201 })
}
