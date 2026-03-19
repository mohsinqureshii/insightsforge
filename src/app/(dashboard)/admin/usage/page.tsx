import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageChartClient } from './UsageChartClient'

type TenantUsageRow = {
  tenantId: string
  tenantName: string
  reportsRun: number
  exports: number
  dashboardViews: number
  scheduledDeliveries: number
  total: number
}

type DailyQueryPoint = {
  date: string
  tenantName: string
  tenantId: string
  count: number
}

async function getUsageData(): Promise<{
  tenantUsage: TenantUsageRow[]
  dailyPoints: DailyQueryPoint[]
}> {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [auditRows, tenants] = await Promise.all([
    prisma.ifAuditLog.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        tenantId: { not: null },
        action: {
          in: [
            'query_executed',
            'export_downloaded',
            'dashboard_updated',
            'schedule_created',
          ],
        },
      },
      select: {
        tenantId: true,
        action: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.tenant.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
    }),
  ])

  const tenantNameMap = new Map(tenants.map((t) => [t.id, t.name]))

  // Aggregate per-tenant usage
  const usageMap = new Map<
    string,
    { reportsRun: number; exports: number; dashboardViews: number; scheduledDeliveries: number }
  >()

  // Daily points for chart (query_executed only, grouped by date + tenant)
  const dailyMap = new Map<string, number>()

  for (const row of auditRows) {
    if (!row.tenantId) continue

    if (!usageMap.has(row.tenantId)) {
      usageMap.set(row.tenantId, {
        reportsRun: 0,
        exports: 0,
        dashboardViews: 0,
        scheduledDeliveries: 0,
      })
    }

    const usage = usageMap.get(row.tenantId)!

    switch (row.action) {
      case 'query_executed':
        usage.reportsRun++
        // Daily rollup
        const dateStr = row.createdAt.toISOString().slice(0, 10)
        const key = `${row.tenantId}::${dateStr}`
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1)
        break
      case 'export_downloaded':
        usage.exports++
        break
      case 'dashboard_updated':
        usage.dashboardViews++
        break
      case 'schedule_created':
        usage.scheduledDeliveries++
        break
    }
  }

  const tenantUsage: TenantUsageRow[] = Array.from(usageMap.entries())
    .map(([tenantId, u]) => ({
      tenantId,
      tenantName: tenantNameMap.get(tenantId) ?? tenantId,
      reportsRun: u.reportsRun,
      exports: u.exports,
      dashboardViews: u.dashboardViews,
      scheduledDeliveries: u.scheduledDeliveries,
      total: u.reportsRun + u.exports + u.dashboardViews + u.scheduledDeliveries,
    }))
    .sort((a, b) => b.total - a.total)

  const dailyPoints: DailyQueryPoint[] = Array.from(dailyMap.entries()).map(([key, count]) => {
    const [tenantId, date] = key.split('::')
    return {
      tenantId: tenantId ?? '',
      date: date ?? '',
      tenantName: tenantNameMap.get(tenantId ?? '') ?? tenantId ?? '',
      count,
    }
  })

  return { tenantUsage, dailyPoints }
}

function buildCsvContent(rows: TenantUsageRow[]): string {
  const header = 'Tenant,Reports Run,Exports,Dashboard Views,Scheduled Deliveries,Total'
  const lines = rows.map(
    (r) =>
      `"${r.tenantName}",${r.reportsRun},${r.exports},${r.dashboardViews},${r.scheduledDeliveries},${r.total}`,
  )
  return [header, ...lines].join('\n')
}

export default async function AdminUsagePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (session.activeRole !== 'super_admin') redirect('/admin')

  const { tenantUsage, dailyPoints } = await getUsageData()

  const csvContent = buildCsvContent(tenantUsage)
  const csvDataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usage Analytics</h1>
          <p className="text-muted-foreground">
            Per-tenant usage breakdown — last 30 days
          </p>
        </div>
        <a
          href={csvDataUrl}
          download="insightsforge-usage.csv"
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
        >
          Export CSV
        </a>
      </div>

      {/* Daily queries chart */}
      <Card>
        <CardHeader>
          <CardTitle>Queries per Tenant per Day (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChartClient dailyPoints={dailyPoints} />
        </CardContent>
      </Card>

      {/* Usage breakdown table */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Breakdown by Tenant</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Reports Run
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Exports
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Dashboard Views
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Deliveries
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {tenantUsage.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No usage data for the last 30 days
                    </td>
                  </tr>
                )}
                {tenantUsage.map((row) => (
                  <tr key={row.tenantId} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.tenantName}</td>
                    <td className="px-4 py-3 text-right">{row.reportsRun.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{row.exports.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{row.dashboardViews.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {row.scheduledDeliveries.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {row.total.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
