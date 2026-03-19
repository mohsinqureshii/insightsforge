import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { decryptCredential } from '@/lib/encryption'
import type { ApiResponse } from '@/types/insightsforge'

const runSchema = z.object({
  parameters: z.record(z.unknown()).optional(),
  limit: z.number().int().min(1).max(10000).optional().default(1000),
  offset: z.number().int().min(0).optional().default(0),
})

export interface QueryRunResult {
  rows: Record<string, unknown>[]
  columns: string[]
  totalRows: number
  queryTimeMs: number
  cached: boolean
}

type Params = { params: { id: string } }

// POST /api/v1/reports/:id/run - Execute a report query
export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<QueryRunResult>>> {
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

  // Fetch the report (scoped to tenant)
  const report = await prisma.ifReport.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    include: {
      dataSource: {
        select: { id: true, name: true, type: true, config: true, isActive: true },
      },
    },
  })

  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  if (!report.dataSource) {
    return NextResponse.json(
      { success: false, error: 'Report has no associated data source' },
      { status: 422 },
    )
  }

  if (!report.dataSource.isActive) {
    return NextResponse.json(
      { success: false, error: 'Data source is not active' },
      { status: 422 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const parsed = runSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { parameters, limit, offset } = parsed.data

  // Decrypt data source credentials (available for real connector integration)
  let _decryptedConfig: Record<string, unknown> = {}
  try {
    const raw = decryptCredential(report.dataSource.config)
    _decryptedConfig = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to decrypt data source credentials' },
      { status: 500 },
    )
  }

  // Extract report definition / config
  const reportConfig = report.config as Record<string, unknown>
  const reportColumns = Array.isArray(reportConfig.columns)
    ? (reportConfig.columns as Array<{ field?: string; label?: string; id?: string }>)
    : []

  const startTime = Date.now()

  // --- Demo / stub query execution ---
  // Real connector logic (postgresql, bigquery, etc.) can be hooked in here
  // by replacing this block with: await executeQuery(report.dataSource, report.query, parameters)
  const demoColumns =
    reportColumns.length > 0
      ? reportColumns.map((c) => c.field ?? c.id ?? 'column')
      : ['id', 'name', 'value', 'created_at']

  const totalRows = 42 // stub total
  const clampedLimit = Math.min(limit, totalRows - offset)
  const rowCount = Math.max(0, clampedLimit)

  const rows: Record<string, unknown>[] = Array.from({ length: rowCount }, (_, i) => {
    const row: Record<string, unknown> = {}
    demoColumns.forEach((col, colIdx) => {
      if (col === 'id' || col.endsWith('_id')) {
        row[col] = `demo-${offset + i + 1}`
      } else if (col.includes('at') || col.includes('date')) {
        row[col] = new Date(Date.now() - i * 86400000).toISOString()
      } else if (col === 'value' || col.includes('count') || col.includes('total')) {
        row[col] = Math.floor(Math.random() * 1000)
      } else {
        row[col] = `Demo ${col} ${colIdx + 1} (row ${offset + i + 1})`
      }
    })
    // Apply parameter overrides if any
    if (parameters && typeof parameters === 'object') {
      Object.assign(row, { _appliedParameters: parameters })
    }
    return row
  })

  const queryTimeMs = Date.now() - startTime

  // Update lastRunAt on the report (fire-and-forget)
  prisma.ifReport
    .update({
      where: { id: params.id },
      data: { lastRunAt: new Date() },
    })
    .catch(() => null)

  return NextResponse.json({
    success: true,
    data: {
      rows,
      columns: demoColumns,
      totalRows,
      queryTimeMs,
      cached: false,
    },
  })
}
