import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import type { ApiResponse, DashboardWidget } from '@/types/insightsforge'

const addWidgetSchema = z.object({
  type: z.enum(['report', 'metric', 'text', 'image', 'embed']),
  reportId: z.string().optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  displayConfig: z.record(z.unknown()).optional().default({}),
  gridPos: z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().min(1),
    h: z.number().int().min(1),
    minW: z.number().int().min(1).optional(),
    minH: z.number().int().min(1).optional(),
  }),
})

type Params = { params: { id: string } }

// POST /api/v1/dashboards/:id/widgets - Add a widget to dashboard
export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<DashboardWidget>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DASHBOARD_UPDATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  // Verify dashboard exists and belongs to this tenant
  const dashboard = await prisma.ifDashboard.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })
  if (!dashboard) {
    return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = addWidgetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { type, reportId, title, displayConfig, gridPos } = parsed.data

  // If reportId is provided, verify it belongs to this tenant
  if (reportId) {
    const report = await prisma.ifReport.findFirst({
      where: { id: reportId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }
  }

  const widget = await prisma.ifDashboardWidget.create({
    data: {
      dashboardId: params.id,
      type,
      reportId: reportId ?? null,
      title: title ?? null,
      position: gridPos,
      config: displayConfig,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: widget.id,
        dashboardId: widget.dashboardId,
        reportId: widget.reportId,
        title: widget.title,
        type: widget.type as DashboardWidget['type'],
        size: widget.size as DashboardWidget['size'],
        position: widget.position as DashboardWidget['position'],
        config: widget.config as Record<string, unknown>,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      },
    },
    { status: 201 },
  )
}
