import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { encryptCredential } from '@/lib/encryption'
import { checkTenantLimit } from '@/lib/tenant'
import type { ApiResponse, PaginatedResponse, DataSource } from '@/types/insightsforge'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
  type: z.string().optional(),
})

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum([
    'postgresql', 'mysql', 'mssql', 'bigquery', 'snowflake', 'redshift',
    'mongodb', 'clickhouse', 'sqlite', 'csv_upload', 'rest_api', 'google_sheets',
  ]),
  config: z.record(z.unknown()),
})

// GET /api/v1/data-sources - List data sources
export async function GET(
  req: NextRequest,
): Promise<NextResponse<PaginatedResponse<DataSource>>> {
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
    await requirePermission(session.user.id, tenantId, 'DATA_SOURCE_READ')
  } catch {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 403 },
    )
  }

  const { searchParams } = req.nextUrl
  const parsed = querySchema.parse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
    q: searchParams.get('q'),
    type: searchParams.get('type'),
  })

  const where = {
    tenantId,
    deletedAt: null,
    ...(parsed.q ? { name: { contains: parsed.q, mode: 'insensitive' as const } } : {}),
    ...(parsed.type ? { type: parsed.type as never } : {}),
  }

  const [total, sources] = await Promise.all([
    prisma.ifDataSource.count({ where }),
    prisma.ifDataSource.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        type: true,
        isActive: true,
        lastTestedAt: true,
        lastSyncAt: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        schema: true,
        // Exclude config (encrypted credentials)
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: sources as unknown as DataSource[],
    meta: {
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages: Math.ceil(total / parsed.pageSize),
    },
  })
}

// POST /api/v1/data-sources - Create a data source
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DataSource>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DATA_SOURCE_CREATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  // Check tenant plan limit
  const limit = await checkTenantLimit(tenantId, 'sources')
  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Data source limit reached (${limit.current}/${limit.max}). Upgrade your plan to add more.`,
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

  const { name, description, type, config } = parsed.data

  // Encrypt the config before storing
  let encryptedConfig: string
  try {
    encryptedConfig = encryptCredential(JSON.stringify(config))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Encryption failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }

  const source = await prisma.ifDataSource.create({
    data: {
      tenantId,
      name,
      description,
      type: type as never,
      config: encryptedConfig,
      createdBy: session.user.id,
    },
  })

  return NextResponse.json(
    {
      success: true,
      data: {
        id: source.id,
        tenantId: source.tenantId,
        name: source.name,
        description: source.description,
        type: source.type as unknown as DataSource['type'],
        isActive: source.isActive,
        lastTestedAt: source.lastTestedAt,
        lastSyncAt: source.lastSyncAt,
        createdBy: source.createdBy,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      },
    },
    { status: 201 },
  )
}
