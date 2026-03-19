import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'
import {
  Database,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Wifi,
  RefreshCw,
  Edit2,
  Trash2,
  BarChart3,
  Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { ConnectorType, DatabaseSchema, SchemaTable } from '@/types/insightsforge'

interface DataSourceDetail {
  id: string
  name: string
  description: string | null
  type: ConnectorType
  isActive: boolean
  lastTestedAt: Date | null
  lastSyncAt: Date | null
  schema: DatabaseSchema | null
  createdAt: Date
  updatedAt: Date
  reports: Array<{
    id: string
    name: string
    type: string
    updatedAt: Date
  }>
}

async function getDataSource(id: string, tenantId: string): Promise<DataSourceDetail | null> {
  const ds = await prisma.ifDataSource.findFirst({
    where: { id, tenantId, deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      isActive: true,
      lastTestedAt: true,
      lastSyncAt: true,
      schema: true,
      createdAt: true,
      updatedAt: true,
      reports: {
        where: { deletedAt: null },
        select: { id: true, name: true, type: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      },
    },
  })
  return ds as DataSourceDetail | null
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

export default async function DataSourceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) redirect('/login')

  const ds = await getDataSource(params.id, tenantId)
  if (!ds) notFound()

  const schema = ds.schema as DatabaseSchema | null
  const tables: SchemaTable[] = schema?.tables ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href="/data-sources">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Data Sources
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{ds.name}</h1>
            <Badge variant="secondary">{CONNECTOR_LABELS[ds.type] ?? ds.type}</Badge>
            {ds.isActive ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3 w-3" />
                Error
              </Badge>
            )}
          </div>
          {ds.description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{ds.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm">
            <Wifi className="mr-2 h-4 w-4" />
            Test
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Schema
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/data-sources/${ds.id}?edit=true`}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Meta cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground">Type</p>
            <p className="mt-1 font-semibold">{CONNECTOR_LABELS[ds.type] ?? ds.type}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground">Last Tested</p>
            <p className="mt-1 font-semibold">
              {ds.lastTestedAt ? formatRelativeTime(ds.lastTestedAt) : 'Never'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-medium text-muted-foreground">Last Schema Sync</p>
            <p className="mt-1 font-semibold">
              {ds.lastSyncAt ? formatRelativeTime(ds.lastSyncAt) : 'Never'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Schema / Fields */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Table2 className="h-4 w-4" />
                Schema
              </CardTitle>
              <CardDescription>
                {tables.length > 0
                  ? `${tables.length} tables · ${tables.reduce((acc, t) => acc + t.columns.length, 0)} columns`
                  : 'No schema cached. Click "Refresh Schema" to load.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Database className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No schema available. Refresh schema to load table information.
                  </p>
                  <Button variant="outline" size="sm" className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Schema
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[480px] overflow-y-auto">
                  {tables.map((table) => (
                    <div key={table.name} className="rounded-lg border overflow-hidden">
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2">
                        <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-semibold">
                          {table.schema ? `${table.schema}.${table.name}` : table.name}
                        </span>
                        {table.rowCount !== undefined && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {table.rowCount.toLocaleString()} rows
                          </Badge>
                        )}
                      </div>
                      <table className="w-full text-xs">
                        <thead className="bg-muted/20">
                          <tr>
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Column</th>
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Type</th>
                            <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Nullable</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {table.columns.map((col) => (
                            <tr key={col.name} className="hover:bg-muted/20">
                              <td className="px-3 py-1.5 font-mono font-medium">
                                {col.name}
                                {col.isPrimaryKey && (
                                  <Badge variant="outline" className="ml-1.5 text-[10px] py-0 h-4">PK</Badge>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-muted-foreground font-mono">{col.type}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">
                                {col.nullable ? 'Yes' : 'No'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reports using this data source */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Reports
              </CardTitle>
              <CardDescription>Reports using this data source</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {ds.reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-sm text-muted-foreground">No reports yet</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/reports/new">Create Report</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {ds.reports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className="flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <span className="truncate font-medium">{report.name}</span>
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {report.type}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
