import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import {
  Plus,
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  MoreVertical,
  Wifi,
  Edit2,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ConnectorType } from '@/types/insightsforge'

interface DataSourceListItem {
  id: string
  name: string
  description: string | null
  type: ConnectorType
  isActive: boolean
  lastTestedAt: Date | null
  lastSyncAt: Date | null
  createdAt: Date
  updatedAt: Date
  _count: { reports: number }
}

async function getDataSources(tenantId: string): Promise<DataSourceListItem[]> {
  return prisma.ifDataSource.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isActive: true,
      lastTestedAt: true,
      lastSyncAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { reports: true } },
    },
    orderBy: { updatedAt: 'desc' },
  }) as Promise<DataSourceListItem[]>
}

const CONNECTOR_LABELS: Record<ConnectorType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  bigquery: 'BigQuery',
  snowflake: 'Snowflake',
  redshift: 'Redshift',
  mongodb: 'MongoDB',
  clickhouse: 'ClickHouse',
  sqlite: 'SQLite',
  csv_upload: 'CSV Upload',
  rest_api: 'REST API',
  google_sheets: 'Google Sheets',
}

const CONNECTOR_COLORS: Record<ConnectorType, string> = {
  postgresql: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  mysql: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  mssql: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30',
  bigquery: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  snowflake: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30',
  redshift: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  mongodb: 'text-green-700 bg-green-100 dark:bg-green-900/30',
  clickhouse: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  sqlite: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30',
  csv_upload: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30',
  rest_api: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30',
  google_sheets: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
}

export default async function DataSourcesPage() {
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

  const dataSources = await getDataSources(tenantId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your connected databases and APIs
          </p>
        </div>
        <Button asChild>
          <Link href="/data-sources/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Data Source
          </Link>
        </Button>
      </div>

      {/* Content */}
      {dataSources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Database className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No data sources connected</h3>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Connect your first database or API to start building reports
          </p>
          <Button asChild>
            <Link href="/data-sources/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Data Source
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dataSources.map((ds) => (
            <DataSourceCard key={ds.id} dataSource={ds} />
          ))}
        </div>
      )}
    </div>
  )
}

function DataSourceCard({ dataSource }: { dataSource: DataSourceListItem }) {
  const colorClass =
    CONNECTOR_COLORS[dataSource.type] ??
    'text-slate-600 bg-slate-100 dark:bg-slate-900/30'
  const label = CONNECTOR_LABELS[dataSource.type] ?? dataSource.type

  return (
    <Card className="group flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2.5 ${colorClass}`}>
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold truncate">{dataSource.name}</h3>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
          <div className="shrink-0">
            {dataSource.isActive ? (
              <div className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                <span>Error</span>
              </div>
            )}
          </div>
        </div>
        {dataSource.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
            {dataSource.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 mt-auto">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          {dataSource.lastSyncAt ? (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Synced {formatRelativeTime(dataSource.lastSyncAt)}</span>
            </div>
          ) : (
            <span className="italic">Never synced</span>
          )}
          <span>{dataSource._count.reports} reports</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-7" asChild>
            <Link href={`/data-sources/${dataSource.id}`}>
              View
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Test connection"
          >
            <Wifi className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Refresh schema"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Edit"
            asChild
          >
            <Link href={`/data-sources/${dataSource.id}?edit=true`}>
              <Edit2 className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
