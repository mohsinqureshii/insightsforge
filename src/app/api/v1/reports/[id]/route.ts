import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireOwnerOrRole } from '@/lib/rbac'
import type { ApiResponse, Report } from '@/types/insightsforge'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  definition: z.record(z.unknown()).optional(),
  isPublic: z.boolean().optional(),
  folderId: z.string().optional().nullable(),
})

type Params = { params: { id: string } }

// GET /api/v1/reports/:id - Get single report
export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<Report & { dataSourceName?: string | null }>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'REPORT_READ')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const report = await prisma.ifReport.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    include: {
      dataSource: {
        select: { name: true },
      },
    },
  })

  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      id: report.id,
      tenantId: report.tenantId,
      dataSourceId: report.dataSourceId,
      folderId: report.folderId,
      name: report.name,
      description: report.description,
      type: report.type as Report['type'],
      chartType: report.chartType as Report['chartType'],
      query: report.query,
      config: report.config as Report['config'],
      visibility: report.visibility as Report['visibility'],
      isFeatured: report.isFeatured,
      viewCount: report.viewCount,
      createdBy: report.createdBy,
      lastRunAt: report.lastRunAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      dataSourceName: report.dataSource?.name ?? null,
    },
  })
}

// PATCH /api/v1/reports/:id - Update report
export async function PATCH(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<Report>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'REPORT_UPDATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const report = await prisma.ifReport.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })
  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  // Check ownership or require analytics_admin+ role
  try {
    await requireOwnerOrRole(session.user.id, tenantId, report.createdBy, 'analytics_admin')
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

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { name, description, definition, isPublic, folderId } = parsed.data
  const updateData: Record<string, unknown> = {}

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (definition !== undefined) updateData.config = definition
  if (isPublic !== undefined) updateData.visibility = isPublic ? 'public' : 'private'
  if (folderId !== undefined) updateData.folderId = folderId

  const updated = await prisma.ifReport.update({
    where: { id: params.id },
    data: updateData as never,
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      tenantId: updated.tenantId,
      dataSourceId: updated.dataSourceId,
      folderId: updated.folderId,
      name: updated.name,
      description: updated.description,
      type: updated.type as Report['type'],
      chartType: updated.chartType as Report['chartType'],
      query: updated.query,
      config: updated.config as Report['config'],
      visibility: updated.visibility as Report['visibility'],
      isFeatured: updated.isFeatured,
      viewCount: updated.viewCount,
      createdBy: updated.createdBy,
      lastRunAt: updated.lastRunAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
}

// DELETE /api/v1/reports/:id - Soft-delete report
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
    await requirePermission(session.user.id, tenantId, 'REPORT_DELETE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const report = await prisma.ifReport.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })
  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  // Soft delete
  await prisma.ifReport.update({
    where: { id: params.id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ success: true })
}
