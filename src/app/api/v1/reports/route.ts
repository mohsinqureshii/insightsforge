import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { checkTenantLimit } from '@/lib/tenant'
import type { ApiResponse, PaginatedResponse, Report } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
  type: z.string().optional(),
  folderId: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  dataSourceId: z.string().min(1),
  type: z.enum(['table', 'chart', 'metric', 'pivot', 'funnel', 'cohort', 'custom_sql']),
  definition: z.record(z.unknown()),
})

// GET /api/v1/reports - List reports for tenant
export async function GET(
  req: NextRequest,
): Promise<NextResponse<PaginatedResponse<Report & { createdByUser?: { name: string | null } }>>> {
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
    await requirePermission(session.user.id, tenantId, 'REPORT_READ')
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
    q: searchParams.get('q') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    folderId: searchParams.get('folderId') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 422 },
    )
  }

  const { page, pageSize, q, type, folderId } = parsed.data

  const where = {
    tenantId,
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(type ? { type: type as never } : {}),
    ...(folderId ? { folderId } : {}),
  }

  const [total, reports] = await Promise.all([
    prisma.ifReport.count({ where }),
    prisma.ifReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        tenantId: true,
        dataSourceId: true,
        folderId: true,
        name: true,
        description: true,
        type: true,
        chartType: true,
        query: true,
        config: true,
        visibility: true,
        isFeatured: true,
        viewCount: true,
        createdBy: true,
        lastRunAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ])

  // Fetch createdByUser names for all reports in a single query
  const userIds = [...new Set(reports.map((r) => r.createdBy))]
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u.name]))

  const data = reports.map((r) => ({
    ...r,
    type: r.type as Report['type'],
    chartType: r.chartType as Report['chartType'],
    config: r.config as Report['config'],
    visibility: r.visibility as Report['visibility'],
    createdByUser: { name: userMap.get(r.createdBy) ?? null },
  }))

  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    },
    {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=30' },
    },
  )
}

// POST /api/v1/reports - Create a report
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Report>>> {
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

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { name, description, dataSourceId, type, definition } = parsed.data

  // Verify data source belongs to this tenant
  const dataSource = await prisma.ifDataSource.findFirst({
    where: { id: dataSourceId, tenantId, deletedAt: null },
    select: { id: true },
  })
  if (!dataSource) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 })
  }

  const report = await prisma.ifReport.create({
    data: {
      tenantId,
      dataSourceId,
      name,
      description,
      type: type as never,
      config: definition,
      createdBy: session.user.id,
    },
  })

  return NextResponse.json(
    {
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
      },
    },
    { status: 201 },
  )
}
