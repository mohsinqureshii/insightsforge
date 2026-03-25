import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

type TopTenantUsage = {
  tenantId: string
  name: string
  queryCount: number
}

type PlanBreakdown = {
  starter: number
  business: number
  enterprise: number
}

type PlatformStatsData = {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  revenueMrr: number
  planBreakdown: PlanBreakdown
  topTenantsByUsage: TopTenantUsage[]
  tenants: Array<{
    id: string
    name: string
    slug: string
    plan: string
    status: string
    userCount: number
    queryCount: number
    createdAt: Date
  }>
}

// GET /api/v1/admin/platform-stats — Super Admin only
export async function GET(
  _req: NextRequest,
): Promise<NextResponse<ApiResponse<PlatformStatsData>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  if (session.activeRole !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [totalTenants, activeTenants, totalUsers, tenants, queryLogGroups] = await Promise.all([
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.tenant.count({ where: { deletedAt: null, status: 'active' } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.tenant.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              tenantUsers: {
                where: { inviteStatus: 'accepted' },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.ifAuditLog.groupBy({
        by: ['tenantId'],
        where: {
          action: 'query_executed',
          createdAt: { gte: thirtyDaysAgo },
          tenantId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
    ])

    // Build plan breakdown
    const planBreakdown: PlanBreakdown = { starter: 0, business: 0, enterprise: 0 }
    for (const t of tenants) {
      if (t.plan === 'starter') planBreakdown.starter++
      else if (t.plan === 'business') planBreakdown.business++
      else if (t.plan === 'enterprise') planBreakdown.enterprise++
    }

    // Build a map of tenantId → query count from audit log
    const queryCountMap = new Map<string, number>()
    for (const row of queryLogGroups) {
      if (row.tenantId) {
        queryCountMap.set(row.tenantId, row._count.id)
      }
    }

    // Build tenant name map for topTenantsByUsage
    const tenantNameMap = new Map<string, string>()
    for (const t of tenants) {
      tenantNameMap.set(t.id, t.name)
    }

    const topTenantsByUsage: TopTenantUsage[] = queryLogGroups
      .filter((row) => row.tenantId !== null)
      .map((row) => ({
        tenantId: row.tenantId!,
        name: tenantNameMap.get(row.tenantId!) ?? row.tenantId!,
        queryCount: row._count.id,
      }))

    const tenantsWithCounts = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      status: t.status,
      userCount: t._count.tenantUsers,
      queryCount: queryCountMap.get(t.id) ?? 0,
      createdAt: t.createdAt,
    }))

    // Rough MRR estimate based on plan breakdown
    const PLAN_MRR: Record<string, number> = {
      starter: 49,
      business: 199,
      enterprise: 999,
    }
    const revenueMrr =
      planBreakdown.starter * PLAN_MRR.starter +
      planBreakdown.business * PLAN_MRR.business +
      planBreakdown.enterprise * PLAN_MRR.enterprise

    return NextResponse.json({
      success: true,
      data: {
        totalTenants,
        activeTenants,
        totalUsers,
        revenueMrr,
        planBreakdown,
        topTenantsByUsage,
        tenants: tenantsWithCounts,
      },
    })
  } catch (err) {
    console.error('[platform-stats] error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load platform stats' },
      { status: 500 },
    )
  }
}
