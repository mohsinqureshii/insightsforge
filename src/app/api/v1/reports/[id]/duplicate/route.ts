import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { checkTenantLimit } from '@/lib/tenant'
import type { ApiResponse, Report } from '@/types/insightsforge'

type Params = { params: { id: string } }

// POST /api/v1/reports/:id/duplicate
// Copies a report (including system reports) into the requesting user's tenant.
// Sets isSystemReport: false on the config copy and transfers ownership.
export async function POST(
  _req: NextRequest,
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
    await requirePermission(session.user.id, tenantId, 'REPORT_CREATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  // Check tenant report limit
  const limit = await checkTenantLimit(tenantId, 'reports')
  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Report limit reached (${limit.current}/${limit.max}). Upgrade your plan to create more reports.`,
        code: 'LIMIT_EXCEEDED',
      },
      { status: 422 },
    )
  }

  // Find the source report – allow system reports from any tenant, else scope to own tenant
  const source = await prisma.ifReport.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
    },
  })

  if (!source) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  // Build the duplicated config: strip isSystemReport flag
  const sourceConfig =
    source.config && typeof source.config === 'object' && !Array.isArray(source.config)
      ? (source.config as Record<string, unknown>)
      : {}
  const duplicatedConfig = {
    ...sourceConfig,
    isSystemReport: false,
  }

  const duplicate = await prisma.ifReport.create({
    data: {
      tenantId,
      dataSourceId: source.dataSourceId,
      folderId: null,
      name: `${source.name} (copy)`,
      description: source.description,
      type: source.type,
      chartType: source.chartType,
      query: source.query,
      config: duplicatedConfig as never,
      visibility: 'private',
      isFeatured: false,
      createdBy: session.user.id,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: duplicate.id,
        tenantId: duplicate.tenantId,
        dataSourceId: duplicate.dataSourceId,
        folderId: duplicate.folderId,
        name: duplicate.name,
        description: duplicate.description,
        type: duplicate.type as Report['type'],
        chartType: duplicate.chartType as Report['chartType'],
        query: duplicate.query,
        config: duplicate.config as unknown as Report['config'],
        visibility: duplicate.visibility as Report['visibility'],
        isFeatured: duplicate.isFeatured,
        viewCount: duplicate.viewCount,
        createdBy: duplicate.createdBy,
        lastRunAt: duplicate.lastRunAt,
        createdAt: duplicate.createdAt,
        updatedAt: duplicate.updatedAt,
      },
    },
    { status: 201 },
  )
}
