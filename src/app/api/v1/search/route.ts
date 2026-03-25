import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { applyRateLimit } from '@/lib/api-middleware'
import type { ApiResponse } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const MAX_RESULTS_PER_TYPE = 5

interface SearchResult {
  id: string
  type: 'report' | 'dashboard' | 'data_source' | 'folder'
  name: string
  description?: string | null
  url: string
  updatedAt: Date
}

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'API')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = req.headers.get('X-Tenant-ID')
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant context required' }, { status: 400 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ success: false, error: 'Query must be at least 2 characters' }, { status: 400 })
  }

  const searchTerm = q.toLowerCase()
  const filter = { contains: q, mode: 'insensitive' as const }

  const [reports, dashboards, dataSources, folders] = await Promise.all([
    prisma.ifReport.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ name: filter }, { description: filter }],
      },
      select: { id: true, name: true, description: true, updatedAt: true },
      take: MAX_RESULTS_PER_TYPE,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.ifDashboard.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ name: filter }, { description: filter }],
      },
      select: { id: true, name: true, description: true, updatedAt: true },
      take: MAX_RESULTS_PER_TYPE,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.ifDataSource.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [{ name: filter }, { description: filter }],
      },
      select: { id: true, name: true, description: true, updatedAt: true },
      take: MAX_RESULTS_PER_TYPE,
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.ifFolder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        name: filter,
      },
      select: { id: true, name: true, updatedAt: true },
      take: MAX_RESULTS_PER_TYPE,
      orderBy: { updatedAt: 'desc' },
    }),
  ])

  const results: SearchResult[] = [
    ...reports.map((r) => ({ ...r, type: 'report' as const, url: `/reports/${r.id}` })),
    ...dashboards.map((d) => ({ ...d, type: 'dashboard' as const, url: `/dashboards/${d.id}` })),
    ...dataSources.map((s) => ({ ...s, type: 'data_source' as const, url: `/data-sources/${s.id}` })),
    ...folders.map((f) => ({
      ...f,
      type: 'folder' as const,
      url: `/reports?folder=${f.id}`,
      description: null,
    })),
  ]

  // Sort combined results by updatedAt desc
  results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return NextResponse.json({
    success: true,
    data: {
      results,
      total: results.length,
      query: q,
    },
  })
}
