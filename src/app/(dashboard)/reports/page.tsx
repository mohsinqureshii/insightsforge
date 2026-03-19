import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import {
  BarChart3,
  Plus,
  Table2,
  LineChart,
  PieChart,
  TrendingUp,
  Eye,
  Edit2,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ReportType } from '@/types/insightsforge'

interface ReportListItem {
  id: string
  name: string
  description: string | null
  type: ReportType
  chartType: string | null
  visibility: string
  viewCount: number
  lastRunAt: Date | null
  updatedAt: Date
  createdBy: string
  dataSource: { id: string; name: string } | null
}

async function getReports(tenantId: string): Promise<ReportListItem[]> {
  return prisma.ifReport.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      chartType: true,
      visibility: true,
      viewCount: true,
      lastRunAt: true,
      updatedAt: true,
      createdBy: true,
      dataSource: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  }) as Promise<ReportListItem[]>
}

function reportTypeIcon(type: ReportType) {
  switch (type) {
    case 'table':
      return <Table2 className="h-3.5 w-3.5" />
    case 'chart':
      return <BarChart3 className="h-3.5 w-3.5" />
    case 'metric':
      return <TrendingUp className="h-3.5 w-3.5" />
    case 'pivot':
      return <Table2 className="h-3.5 w-3.5" />
    case 'funnel':
      return <LineChart className="h-3.5 w-3.5" />
    case 'cohort':
      return <PieChart className="h-3.5 w-3.5" />
    case 'custom_sql':
      return <BarChart3 className="h-3.5 w-3.5" />
    default:
      return <BarChart3 className="h-3.5 w-3.5" />
  }
}

function reportTypeBadgeVariant(type: ReportType): 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'table':
      return 'secondary'
    case 'chart':
      return 'default'
    case 'metric':
      return 'outline'
    case 'custom_sql':
      return 'outline'
    default:
      return 'secondary'
  }
}

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="mb-2 text-2xl font-bold">No organization found</h2>
        <p className="text-muted-foreground">
          You&apos;re not a member of any organization yet.
        </p>
      </div>
    )
  }

  const reports = await getReports(tenantId)

  const reportTypes: Array<{ label: string; value: ReportType | 'all' }> = [
    { label: 'All', value: 'all' },
    { label: 'Table', value: 'table' },
    { label: 'Chart', value: 'chart' },
    { label: 'Metric', value: 'metric' },
    { label: 'Pivot', value: 'pivot' },
    { label: 'Custom SQL', value: 'custom_sql' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build and manage your analytics reports
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </Button>
      </div>

      {/* Type filter tabs */}
      <div className="flex items-center gap-1 border-b">
        {reportTypes.map((t) => (
          <div
            key={t.value}
            className="cursor-pointer border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground first:border-primary first:text-foreground"
          >
            {t.label}
            {t.value !== 'all' && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {reports.filter((r) => r.type === t.value).length}
              </span>
            )}
            {t.value === 'all' && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                {reports.length}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No reports yet</h3>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Create your first report to start analyzing your data
          </p>
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="mr-2 h-4 w-4" />
              New Report
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Source</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visibility</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Updated</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {reportTypeIcon(report.type)}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/reports/${report.id}`}
                          className="font-medium hover:underline truncate block max-w-[240px]"
                        >
                          {report.name}
                        </Link>
                        {report.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={reportTypeBadgeVariant(report.type)} className="text-xs capitalize">
                      {report.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {report.dataSource ? (
                      <span className="text-sm text-muted-foreground">{report.dataSource.name}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs capitalize">
                      {report.visibility}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatRelativeTime(report.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <Link href={`/reports/${report.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                        <Link href={`/reports/${report.id}/edit`}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
