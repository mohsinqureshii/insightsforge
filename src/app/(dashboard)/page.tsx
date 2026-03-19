import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatRelativeTime, formatNumber } from '@/lib/utils'
import {
  BarChart3,
  Database,
  LayoutDashboard,
  Users,
  Zap,
  Calendar,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface OverviewStats {
  totalReports: number
  totalDashboards: number
  totalDataSources: number
  totalUsers: number
  activeSchedules: number
  recentActivity: Array<{
    id: string
    action: string
    entityType: string | null
    entityId: string | null
    createdAt: Date
    user: { name: string | null; email: string } | null
  }>
}

async function getOverviewStats(tenantId: string): Promise<OverviewStats> {
  const [
    totalReports,
    totalDashboards,
    totalDataSources,
    totalUsers,
    activeSchedules,
    recentActivity,
  ] = await Promise.all([
    prisma.ifReport.count({ where: { tenantId, deletedAt: null } }),
    prisma.ifDashboard.count({ where: { tenantId, deletedAt: null } }),
    prisma.ifDataSource.count({ where: { tenantId, deletedAt: null, isActive: true } }),
    prisma.tenantUser.count({ where: { tenantId, inviteStatus: 'accepted' } }),
    prisma.ifSchedule.count({ where: { tenantId, isActive: true } }),
    prisma.ifAuditLog.findMany({
      where: { tenantId },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  return {
    totalReports,
    totalDashboards,
    totalDataSources,
    totalUsers,
    activeSchedules,
    recentActivity,
  }
}

function formatAction(action: string): string {
  return action
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
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
      href: '/reports',
    },
    {
      label: 'Dashboards',
      value: formatNumber(stats.totalDashboards),
      icon: LayoutDashboard,
      description: 'Total dashboards',
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      href: '/dashboards',
    },
    {
      label: 'Data Sources',
      value: formatNumber(stats.totalDataSources),
      icon: Database,
      description: 'Connected sources',
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/30',
      href: '/data-sources',
    },
    {
      label: 'Active Schedules',
      value: formatNumber(stats.activeSchedules),
      icon: Calendar,
      description: 'Scheduled deliveries',
      color: 'text-purple-600',
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      href: '/schedules',
    },
    {
      label: 'Team Members',
      value: formatNumber(stats.totalUsers),
      icon: Users,
      description: 'Active members',
      color: 'text-amber-600',
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      href: '/settings/team',
    },
  ]

  const quickActions = [
    {
      label: 'New Report',
      href: '/reports/new',
      icon: BarChart3,
      desc: 'Build a new chart or table',
    },
    {
      label: 'New Dashboard',
      href: '/dashboards/new',
      icon: LayoutDashboard,
      desc: 'Combine reports into a dashboard',
    },
    {
      label: 'Add Data Source',
      href: '/data-sources/new',
      icon: Database,
      desc: 'Connect a new data source',
    },
    {
      label: 'Invite User',
      href: '/settings/team',
      icon: Users,
      desc: 'Add members to your workspace',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {session.user.name?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Here&apos;s an overview of your analytics workspace.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-primary/40 transition-colors cursor-pointer">
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
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Recent Activity
            </CardTitle>
            <CardDescription>Last 10 events in your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No activity yet.
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{formatAction(entry.action)}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.user?.name ?? entry.user?.email ?? 'System'}
                        {entry.entityType ? ` · ${entry.entityType}` : ''}
                      </p>
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
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
              {quickActions.map((action) => (
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
