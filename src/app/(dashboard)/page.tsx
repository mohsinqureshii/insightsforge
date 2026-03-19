import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatRelativeTime, formatNumber } from '@/lib/utils'
import {
  BarChart3,
  Database,
  LayoutDashboard,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface OverviewStats {
  totalReports: number
  totalDashboards: number
  totalDataSources: number
  totalUsers: number
  recentReports: Array<{
    id: string
    name: string
    type: string
    updatedAt: Date
    createdBy: string
  }>
}

async function getOverviewStats(tenantId: string): Promise<OverviewStats> {
  const [
    totalReports,
    totalDashboards,
    totalDataSources,
    totalUsers,
    recentReports,
  ] = await Promise.all([
    prisma.ifReport.count({ where: { tenantId, deletedAt: null } }),
    prisma.ifDashboard.count({ where: { tenantId, deletedAt: null } }),
    prisma.ifDataSource.count({ where: { tenantId, deletedAt: null, isActive: true } }),
    prisma.tenantUser.count({ where: { tenantId, inviteStatus: 'accepted' } }),
    prisma.ifReport.findMany({
      where: { tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
        createdBy: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
  ])

  return {
    totalReports,
    totalDashboards,
    totalDataSources,
    totalUsers,
    recentReports,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="mb-2 text-2xl font-bold">No organization found</h2>
        <p className="text-muted-foreground">
          You&apos;re not a member of any organization yet. Create one or ask for an invite.
        </p>
      </div>
    )
  }

  const stats = await getOverviewStats(tenantId)

  const statCards = [
    {
      label: 'Reports',
      value: formatNumber(stats.totalReports),
      icon: BarChart3,
      description: 'Total reports',
      color: 'text-primary-600',
      bg: 'bg-primary-100 dark:bg-primary-900/30',
    },
    {
      label: 'Dashboards',
      value: formatNumber(stats.totalDashboards),
      icon: LayoutDashboard,
      description: 'Total dashboards',
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Data Sources',
      value: formatNumber(stats.totalDataSources),
      icon: Database,
      description: 'Connected sources',
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Team Members',
      value: formatNumber(stats.totalUsers),
      icon: Users,
      description: 'Active members',
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your analytics workspace.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <div className={`rounded-lg p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Recent Reports
            </CardTitle>
            <CardDescription>Latest updated reports in your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentReports.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No reports yet.{' '}
                <a href="/dashboard/reports/new" className="text-primary-600 hover:underline">
                  Create your first report
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{report.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(report.updatedAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump into common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  label: 'New Report',
                  href: '/dashboard/reports/new',
                  icon: BarChart3,
                  desc: 'Build a new chart or table',
                },
                {
                  label: 'New Dashboard',
                  href: '/dashboard/dashboards/new',
                  icon: LayoutDashboard,
                  desc: 'Combine reports into a dashboard',
                },
                {
                  label: 'Connect Data',
                  href: '/dashboard/data-sources/new',
                  icon: Database,
                  desc: 'Add a new data source',
                },
                {
                  label: 'Invite Team',
                  href: '/dashboard/settings/team',
                  icon: Users,
                  desc: 'Add members to your workspace',
                },
              ].map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm transition hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-800 dark:hover:bg-primary-950/30"
                >
                  <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
                  <div>
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
