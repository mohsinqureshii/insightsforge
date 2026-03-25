import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import type { ApiResponse, Schedule } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

// Basic cron expression validator: validates the 5-field standard cron format
function isValidCronExpression(expr: string): boolean {
  const fields = expr.trim().split(/\s+/)
  if (fields.length !== 5) return false
  const patterns = [
    /^(\*|([0-5]?\d)(\/[1-9]\d*)?|([0-5]?\d)-([0-5]?\d)|(\*\/[1-9]\d*))$/,
    /^(\*|([01]?\d|2[0-3])(\/[1-9]\d*)?|([01]?\d|2[0-3])-([01]?\d|2[0-3])|(\*\/[1-9]\d*))$/,
    /^(\*|([1-9]|[12]\d|3[01])(\/[1-9]\d*)?|([1-9]|[12]\d|3[01])-([1-9]|[12]\d|3[01])|(\*\/[1-9]\d*))$/,
    /^(\*|([1-9]|1[0-2])(\/[1-9]\d*)?|([1-9]|1[0-2])-([1-9]|1[0-2])|(\*\/[1-9]\d*))$/,
    /^(\*|[0-6](\/[1-9]\d*)?|[0-6]-[0-6]|(\*\/[1-9]\d*))$/,
  ]
  return fields.every((field, i) => patterns[i]?.test(field) ?? false)
}

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  cronExpression: z.string().optional(),
  timezone: z.string().optional(),
  recipients: z.array(z.string().email()).optional(),
  format: z.enum(['pdf', 'csv', 'excel']).optional(),
  enabled: z.boolean().optional(),
})

type Params = { params: { id: string } }

// GET /api/v1/schedules/:id - Get single schedule
export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<Schedule>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SCHEDULE_READ')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const schedule = await prisma.ifSchedule.findFirst({
    where: { id: params.id, tenantId },
  })

  if (!schedule) {
    return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })
  }

  return NextResponse.json({
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
  })
}

// PATCH /api/v1/schedules/:id - Update schedule
export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<Schedule>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SCHEDULE_UPDATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const schedule = await prisma.ifSchedule.findFirst({
    where: { id: params.id, tenantId },
  })
  if (!schedule) {
    return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateScheduleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { name, cronExpression, timezone, recipients, format, enabled } = parsed.data

  // Validate new cron expression if provided
  if (cronExpression !== undefined && !isValidCronExpression(cronExpression)) {
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

  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (cronExpression !== undefined) updateData.cronExpr = cronExpression
  if (timezone !== undefined) updateData.timezone = timezone
  if (enabled !== undefined) updateData.isActive = enabled

  if (recipients !== undefined) {
    updateData.recipients = recipients.map((email) => ({
      type: 'email' as const,
      value: email,
    }))
  }

  if (format !== undefined) {
    const existingConfig = (schedule.config as Record<string, unknown>) ?? {}
    updateData.config = { ...existingConfig, format }
  }

  const updated = await prisma.ifSchedule.update({
    where: { id: params.id },
    data: updateData as never,
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      tenantId: updated.tenantId,
      reportId: updated.reportId,
      dashboardId: updated.dashboardId,
      name: updated.name,
      frequency: updated.frequency as Schedule['frequency'],
      cronExpr: updated.cronExpr,
      timezone: updated.timezone,
      channel: updated.channel as Schedule['channel'],
      recipients: updated.recipients as Schedule['recipients'],
      config: updated.config as Schedule['config'],
      isActive: updated.isActive,
      lastRunAt: updated.lastRunAt,
      nextRunAt: updated.nextRunAt,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
    },
  })
}

// DELETE /api/v1/schedules/:id - Delete schedule
export async function DELETE(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SCHEDULE_DELETE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const schedule = await prisma.ifSchedule.findFirst({
    where: { id: params.id, tenantId },
  })
  if (!schedule) {
    return NextResponse.json({ success: false, error: 'Schedule not found' }, { status: 404 })
  }

  // Hard delete (schedules have no soft-delete in schema)
  await prisma.ifSchedule.delete({
    where: { id: params.id },
  })

  return NextResponse.json({ success: true })
}
