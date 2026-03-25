import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import type { ApiResponse, Dashboard, DashboardWidget } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const widgetPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  minW: z.number().optional(),
  minH: z.number().optional(),
})

const widgetSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  reportId: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  size: z.enum(['small', 'medium', 'large', 'full']).optional().default('medium'),
  position: widgetPositionSchema,
  config: z.record(z.unknown()).optional().default({}),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  config: z.record(z.unknown()).optional(),
  widgets: z.array(widgetSchema).optional(),
})

type Params = { params: { id: string } }

// GET /api/v1/dashboards/:id - Get single dashboard with all widgets
export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<Dashboard & { widgets: DashboardWidget[] }>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DASHBOARD_READ')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const dashboard = await prisma.ifDashboard.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    include: {
      widgets: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!dashboard) {
    return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 })
  }

  const widgets: DashboardWidget[] = dashboard.widgets.map((w) => ({
    id: w.id,
    dashboardId: w.dashboardId,
    reportId: w.reportId,
    title: w.title,
    type: w.type as DashboardWidget['type'],
    size: w.size as DashboardWidget['size'],
    position: w.position as DashboardWidget['position'],
    config: w.config as Record<string, unknown>,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }))

  return NextResponse.json({
    success: true,
    data: {
      id: dashboard.id,
      tenantId: dashboard.tenantId,
      folderId: dashboard.folderId,
      name: dashboard.name,
      description: dashboard.description,
      layout: dashboard.layout as Dashboard['layout'],
      config: dashboard.config as Dashboard['config'],
      visibility: dashboard.visibility as Dashboard['visibility'],
      isFeatured: dashboard.isFeatured,
      viewCount: dashboard.viewCount,
      createdBy: dashboard.createdBy,
      createdAt: dashboard.createdAt,
      updatedAt: dashboard.updatedAt,
      widgets,
    },
  })
}

// PATCH /api/v1/dashboards/:id - Update dashboard
export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<Dashboard>>> {
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

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { name, description, config, widgets } = parsed.data

  // Run dashboard update and widget sync in a transaction
  const updated = await prisma.$transaction(async (tx) => {
    const dashboardUpdate: Record<string, unknown> = {}
    if (name !== undefined) dashboardUpdate.name = name
    if (description !== undefined) dashboardUpdate.description = description
    if (config !== undefined) dashboardUpdate.config = config

    const updatedDashboard = await tx.ifDashboard.update({
      where: { id: params.id },
      data: dashboardUpdate as never,
    })

    if (widgets !== undefined) {
      // Delete existing widgets and replace with the new set
      await tx.ifDashboardWidget.deleteMany({ where: { dashboardId: params.id } })

      if (widgets.length > 0) {
        await tx.ifDashboardWidget.createMany({
          data: widgets.map((w) => ({
            dashboardId: params.id,
            reportId: w.reportId ?? null,
            title: w.title ?? null,
            type: w.type,
            size: w.size as never,
            position: w.position,
            config: w.config,
          })),
        })
      }
    }

    return updatedDashboard
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      tenantId: updated.tenantId,
      folderId: updated.folderId,
      name: updated.name,
      description: updated.description,
      layout: updated.layout as Dashboard['layout'],
      config: updated.config as Dashboard['config'],
      visibility: updated.visibility as Dashboard['visibility'],
      isFeatured: updated.isFeatured,
      viewCount: updated.viewCount,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
}

// DELETE /api/v1/dashboards/:id - Soft-delete dashboard
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
    await requirePermission(session.user.id, tenantId, 'DASHBOARD_DELETE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const dashboard = await prisma.ifDashboard.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })
  if (!dashboard) {
    return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 })
  }

  // Soft delete
  await prisma.ifDashboard.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
