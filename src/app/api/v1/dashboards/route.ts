import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import type { ApiResponse, PaginatedResponse, Dashboard } from '@/types/insightsforge'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  config: z.record(z.unknown()).optional(),
})

// GET /api/v1/dashboards - List dashboards for tenant
export async function GET(
  req: NextRequest,
): Promise<NextResponse<PaginatedResponse<Dashboard & { widgetCount: number }>>> {
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
    await requirePermission(session.user.id, tenantId, 'DASHBOARD_READ')
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
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 422 },
    )
  }

  const { page, pageSize, q } = parsed.data

  const where = {
    tenantId,
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const [total, dashboards] = await Promise.all([
    prisma.ifDashboard.count({ where }),
    prisma.ifDashboard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { widgets: true },
        },
      },
    }),
  ])

  const data = dashboards.map((d) => ({
    id: d.id,
    tenantId: d.tenantId,
    folderId: d.folderId,
    name: d.name,
    description: d.description,
    layout: d.layout as Dashboard['layout'],
    config: d.config as Dashboard['config'],
    visibility: d.visibility as Dashboard['visibility'],
    isFeatured: d.isFeatured,
    viewCount: d.viewCount,
    createdBy: d.createdBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    widgetCount: d._count.widgets,
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

// POST /api/v1/dashboards - Create a dashboard
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Dashboard>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DASHBOARD_CREATE')
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { name, description, config } = parsed.data

  const dashboard = await prisma.ifDashboard.create({
    data: {
      tenantId,
      name,
      description,
      config: config ?? {},
      createdBy: session.user.id,
    },
  })

  return NextResponse.json(
    {
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
      },
    },
    { status: 201 },
  )
}
