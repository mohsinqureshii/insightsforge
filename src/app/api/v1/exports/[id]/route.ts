import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { decryptCredential } from '@/lib/encryption'

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'excel', 'json']).default('csv'),
})

type Params = { params: { id: string } }

/**
 * Convert an array of row objects to a CSV string.
 * Handles commas, quotes, and newlines inside values.
 */
function rowsToCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const escape = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val)
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const header = columns.map(escape).join(',')
  const body = rows.map((row) => columns.map((col) => escape(row[col])).join(','))
  return [header, ...body].join('\r\n')
}

// GET /api/v1/exports/:id?format=csv|excel|json - Export a report as a file
export async function GET(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse> {
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

  const { searchParams } = req.nextUrl
  const parsed = exportQuerySchema.safeParse({
    format: searchParams.get('format') ?? 'csv',
  })

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid format parameter' },
      { status: 422 },
    )
  }

  const { format } = parsed.data

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

  // Decrypt credentials (available for real connector integration)
  if (report.dataSource) {
    try {
      decryptCredential(report.dataSource.config)
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt data source credentials' },
        { status: 500 },
      )
    }
  }

  // Extract columns from report config
  const reportConfig = report.config as Record<string, unknown>
  const reportColumns = Array.isArray(reportConfig.columns)
    ? (reportConfig.columns as Array<{ field?: string; label?: string; id?: string }>)
    : []
  const columns =
    reportColumns.length > 0
      ? reportColumns.map((c) => c.field ?? c.id ?? 'column')
      : ['id', 'name', 'value', 'created_at']

  // --- Demo / stub query execution ---
  // Real connector logic can be plugged in here
  const totalRows = 42
  const rows: Record<string, unknown>[] = Array.from({ length: totalRows }, (_, i) => {
    const row: Record<string, unknown> = {}
    columns.forEach((col) => {
      if (col === 'id' || col.endsWith('_id')) {
        row[col] = `export-${i + 1}`
      } else if (col.includes('at') || col.includes('date')) {
        row[col] = new Date(Date.now() - i * 86400000).toISOString()
      } else if (col === 'value' || col.includes('count') || col.includes('total')) {
        row[col] = Math.floor(Math.random() * 1000)
      } else {
        row[col] = `Value ${i + 1}`
      }
    })
    return row
  })

  const safeFilename = report.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)
  const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  if (format === 'csv') {
    const csv = rowsToCsv(columns, rows)
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}_${timestamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  if (format === 'json') {
    const payload = JSON.stringify({ report: { id: report.id, name: report.name }, columns, rows }, null, 2)
    return new NextResponse(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename}_${timestamp}.json"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // format === 'excel'
  // Excel export requires the `xlsx` package. Return a stub response with instructions.
  return NextResponse.json(
    {
      success: false,
      error:
        'Excel export requires the xlsx package. Install it with: npm install xlsx, then implement the Excel serialization in this route.',
      code: 'EXCEL_NOT_IMPLEMENTED',
    },
    {
      status: 501,
      headers: {
        'Content-Disposition': `attachment; filename="${safeFilename}_${timestamp}.xlsx"`,
      },
    },
  )
}
