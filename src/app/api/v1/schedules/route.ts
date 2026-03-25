import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import type { ApiResponse, PaginatedResponse, Schedule } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

// Basic cron expression validator: validates the 5-field standard cron format
// e.g. "0 9 * * 1" (every Monday at 9am)
function isValidCronExpression(expr: string): boolean {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return false
  const patterns = [
    /^(\*|([0-5]?\d)(\/[1-9]\d*)?|([0-5]?\d)-([0-5]?\d)|(\*\/[1-9]\d*))$/, // minute
    /^(\*|([01]?\d|2[0-3])(\/[1-9]\d*)?|([01]?\d|2[0-3])-([01]?\d|2[0-3])|(\*\/[1-9]\d*))$/, // hour
    /^(\*|([1-9]|[12]\d|3[01])(\/[1-9]\d*)?|([1-9]|[12]\d|3[01])-([1-9]|[12]\d|3[01])|(\*\/[1-9]\d*))$/, // day of month
    /^(\*|([1-9]|1[0-2])(\/[1-9]\d*)?|([1-9]|1[0-2])-([1-9]|1[0-2])|(\*\/[1-9]\d*))$/, // month
    /^(\*|[0-6](\/[1-9]\d*)?|[0-6]-[0-6]|(\*\/[1-9]\d*))$/, // day of week
  ]
  return fields.every((field, i) => patterns[i]?.test(field) ?? false)
}

const createScheduleSchema = z.object({
  reportId: z.string().min(1),
  name: z.string().min(1).max(200),
  cronExpression: z.string().min(1),
  timezone: z.string().min(1).default('UTC'),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required'),
  format: z.enum(['pdf', 'csv', 'excel']),
  enabled: z.boolean().optional().default(true),
})

// GET /api/v1/schedules - List schedules for tenant
export async function GET(
  req: NextRequest,
): Promise<NextResponse<PaginatedResponse<Schedule>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 401 },
    )
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 400 },
    )
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SCHEDULE_READ')
  } catch {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 403 },
    )
  }

  const { searchParams } = req.nextUrl
  const parsed = querySchema.safeParse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 422 },
    )
  }

  const { page, pageSize } = parsed.data

  const where = { tenantId }

  const [total, schedules] = await Promise.all([
    prisma.ifSchedule.count({ where }),
    prisma.ifSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  const data: Schedule[] = schedules.map((s) => ({
    id: s.id,
    tenantId: s.tenantId,
    reportId: s.reportId,
    dashboardId: s.dashboardId,
    name: s.name,
    frequency: s.frequency as Schedule['frequency'],
    cronExpr: s.cronExpr,
    timezone: s.timezone,
    channel: s.channel as Schedule['channel'],
    recipients: s.recipients as Schedule['recipients'],
    config: s.config as Schedule['config'],
    isActive: s.isActive,
    lastRunAt: s.lastRunAt,
    nextRunAt: s.nextRunAt,
    createdBy: s.createdBy,
    createdAt: s.createdAt,
  }))

  return NextResponse.json({
    success: true,
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

// POST /api/v1/schedules - Create a schedule
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Schedule>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SCHEDULE_CREATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { reportId, name, cronExpression, timezone, recipients, format, enabled } = parsed.data

  // Validate cron expression format
  if (!isValidCronExpression(cronExpression)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Invalid cron expression. Expected 5-field format: minute hour day month weekday (e.g. "0 9 * * 1")',
        code: 'INVALID_CRON',
      },
      { status: 422 },
    )
  }

  // Verify the report belongs to this tenant
  const report = await prisma.ifReport.findFirst({
    where: { id: reportId, tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  // Map email recipients to ScheduleRecipient shape
  const scheduleRecipients = recipients.map((email) => ({
    type: 'email' as const,
    value: email,
  }))

  const schedule = await prisma.ifSchedule.create({
    data: {
      tenantId,
      reportId,
      name,
      frequency: 'cron',
      cronExpr: cronExpression,
      timezone,
      channel: 'email',
      recipients: scheduleRecipients,
      config: { format },
      isActive: enabled ?? true,
      createdBy: session.user.id,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: schedule.id,
        tenantId: schedule.tenantId,
        reportId: schedule.reportId,
        dashboardId: schedule.dashboardId,
        name: schedule.name,
        frequency: schedule.frequency as Schedule['frequency'],
        cronExpr: schedule.cronExpr,
        timezone: schedule.timezone,
        channel: schedule.channel as Schedule['channel'],
        recipients: schedule.recipients as Schedule['recipients'],
        config: schedule.config as Schedule['config'],
        isActive: schedule.isActive,
        lastRunAt: schedule.lastRunAt,
        nextRunAt: schedule.nextRunAt,
        createdBy: schedule.createdBy,
        createdAt: schedule.createdAt,
      },
    },
    { status: 201 },
  )
}
