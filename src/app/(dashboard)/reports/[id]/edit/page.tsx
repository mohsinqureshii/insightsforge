'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  Save,
  Eye,
  Columns,
  Filter,
  ArrowUpDown,
  BarChart3,
  Code2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import type { Report, ReportConfig } from '@/types/insightsforge'

// These imports will be resolved when the components are created
// Using dynamic rendering patterns to avoid errors if not yet created

interface ReportWithDataSource extends Report {
  dataSource?: { id: string; name: string; type: string } | null
}

async function fetchReport(id: string): Promise<ReportWithDataSource> {
  const res = await fetch(`/api/v1/reports/${id}`)
  if (!res.ok) throw new Error('Report not found')
  const json = await res.json()
  return json.data
}

async function patchReport(id: string, data: Partial<Report>): Promise<Report> {
  const res = await fetch(`/api/v1/reports/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Failed to save report')
  }
  const json = await res.json()
  return json.data
}

async function fetchFields(dataSourceId: string): Promise<Array<{ name: string; type: string; table: string }>> {
  const res = await fetch(`/api/v1/data-sources/${dataSourceId}/fields`)
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

function ReportBuilderSkeleton() {
  return (
    <div className="flex h-[calc(100vh-120px)] gap-0 rounded-xl border overflow-hidden">
      <div className="w-64 border-r p-4 space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
      <div className="flex-1 p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
      <div className="w-72 border-l p-4 space-y-3">
        <Skeleton className="h-6 w-24" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

function FieldPickerPanel({
  fields,
  loading,
}: {
  fields: Array<{ name: string; type: string; table: string }>
  loading: boolean
}) {
  const tables = Array.from(new Set(fields.map((f) => f.table)))

  if (loading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-full" />
        ))}
      </div>
    )
  }

  if (fields.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-center text-xs text-muted-foreground px-3">
        No fields available. Select a data source.
      </div>
    )
  }

  return (
    <div className="space-y-4 p-3 overflow-y-auto flex-1">
      {tables.map((table) => (
        <div key={table}>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {table}
          </p>
          <div className="space-y-0.5">
            {fields
              .filter((f) => f.table === table)
              .map((field) => (
                <div
                  key={`${field.table}.${field.name}`}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-muted cursor-grab"
                  draggable
                >
                  <span className="shrink-0 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {field.type}
                  </span>
                  <span className="truncate">{field.name}</span>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ActiveFieldsPanel({ config }: { config: ReportConfig }) {
  return (
    <div className="p-3 space-y-2">
      {config.columns.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Drag fields here to add columns
        </p>
      ) : (
        config.columns.map((col) => (
          <div
            key={col.id}
            className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs bg-background"
          >
            <span className="flex-1 truncate font-medium">{col.label || col.field}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {col.type}
            </Badge>
          </div>
        ))
      )}
    </div>
  )
}

function FilterBuilderPanel({ config }: { config: ReportConfig }) {
  return (
    <div className="p-3 space-y-2">
      {config.filters.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No filters added yet</p>
      ) : (
        config.filters.map((f) => (
          <div
            key={f.id}
            className="rounded-md border px-3 py-2 text-xs bg-background"
          >
            <span className="font-medium">{f.field}</span>{' '}
            <span className="text-muted-foreground">{f.operator}</span>{' '}
            <span className="font-mono">{String(f.value)}</span>
          </div>
        ))
      )}
    </div>
  )
}

function SortPanel({ config }: { config: ReportConfig }) {
  return (
    <div className="p-3 space-y-2">
      {config.sorts.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No sorts configured</p>
      ) : (
        config.sorts.map((s, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs bg-background">
            <span className="flex-1 font-medium">{s.field}</span>
            <Badge variant="outline" className="text-[10px]">
              {s.direction}
            </Badge>
          </div>
        ))
      )}
    </div>
  )
}

function ChartConfigPanel({ report }: { report: ReportWithDataSource }) {
  if (report.type !== 'chart') {
    return (
      <div className="p-3">
        <p className="text-xs text-muted-foreground text-center py-4">
          Chart config is only available for chart report types.
        </p>
      </div>
    )
  }
  return (
    <div className="p-3 space-y-3">
      <div className="rounded-md border px-3 py-2 text-xs">
        <p className="font-medium">Chart Type</p>
        <p className="text-muted-foreground mt-0.5 capitalize">{report.chartType ?? 'bar'}</p>
      </div>
      <p className="text-xs text-muted-foreground text-center py-2">
        Advanced chart configuration coming soon
      </p>
    </div>
  )
}

function SqlPreviewPanel({ report }: { report: ReportWithDataSource }) {
  return (
    <div className="p-3">
      {report.query ? (
        <pre className="overflow-auto rounded-md bg-muted p-3 text-xs font-mono leading-relaxed">
          {report.query}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          No SQL query defined yet
        </p>
      )}
    </div>
  )
}

export default function ReportEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('fields')
  const [localConfig, setLocalConfig] = useState<ReportConfig | null>(null)

  const {
    data: report,
    isLoading: loadingReport,
    error: reportError,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => fetchReport(id),
    enabled: !!id,
  })

  useEffect(() => {
    if (report && !localConfig) {
      setLocalConfig(report.config ?? { columns: [], filters: [], sorts: [] })
    }
  }, [report, localConfig])

  const {
    data: fields = [],
    isLoading: loadingFields,
  } = useQuery({
    queryKey: ['data-source-fields', report?.dataSourceId],
    queryFn: () => fetchFields(report!.dataSourceId!),
    enabled: !!report?.dataSourceId,
  })

  const saveMutation = useMutation({
    mutationFn: (data: Partial<Report>) => patchReport(id, data),
    onSuccess: () => toast.success('Report saved'),
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSave = useCallback(() => {
    if (!localConfig) return
    saveMutation.mutate({ config: localConfig })
  }, [localConfig, saveMutation])

  if (loadingReport) return <ReportBuilderSkeleton />

  if (reportError || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-lg font-semibold">Report not found</h2>
        <Button className="mt-4" asChild>
          <Link href="/reports">Back to Reports</Link>
        </Button>
      </div>
    )
  }

  const config = localConfig ?? report.config ?? { columns: [], filters: [], sorts: [] }

  return (
    <div className="flex flex-col h-[calc(100vh-96px)] space-y-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 pb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/reports/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold truncate">{report.name}</h1>
            <Badge variant="secondary" className="capitalize shrink-0">
              {report.type.replace('_', ' ')}
            </Badge>
          </div>
          {report.dataSource && (
            <p className="text-xs text-muted-foreground">
              Data source: {report.dataSource.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/reports/${id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Builder layout */}
      <div className="flex flex-1 min-h-0 rounded-xl border overflow-hidden">
        {/* Left panel – Field picker */}
        <div className="flex w-64 shrink-0 flex-col border-r">
          <div className="border-b px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Fields
            </p>
          </div>
          <FieldPickerPanel fields={fields} loading={loadingFields} />
        </div>

        {/* Center – Config tabs + Preview */}
        <div className="flex flex-1 flex-col min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 min-h-0"
          >
            <TabsList className="justify-start rounded-none border-b h-auto p-0 bg-transparent">
              <TabsTrigger
                value="fields"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 text-xs"
              >
                <Columns className="mr-1.5 h-3.5 w-3.5" />
                Fields
              </TabsTrigger>
              <TabsTrigger
                value="filters"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 text-xs"
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Filters
              </TabsTrigger>
              <TabsTrigger
                value="sort"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 text-xs"
              >
                <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
                Sort
              </TabsTrigger>
              <TabsTrigger
                value="chart"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 text-xs"
              >
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Chart Config
              </TabsTrigger>
              <TabsTrigger
                value="sql"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-4 py-2.5 text-xs"
              >
                <Code2 className="mr-1.5 h-3.5 w-3.5" />
                SQL Preview
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="fields" className="m-0 h-full">
                <ActiveFieldsPanel config={config} />
              </TabsContent>
              <TabsContent value="filters" className="m-0 h-full">
                <FilterBuilderPanel config={config} />
              </TabsContent>
              <TabsContent value="sort" className="m-0 h-full">
                <SortPanel config={config} />
              </TabsContent>
              <TabsContent value="chart" className="m-0 h-full">
                <ChartConfigPanel report={report} />
              </TabsContent>
              <TabsContent value="sql" className="m-0 h-full">
                <SqlPreviewPanel report={report} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right panel – Preview / Config */}
        <div className="flex w-72 shrink-0 flex-col border-l">
          <div className="border-b px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preview
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="rounded-lg bg-muted p-6">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Configure fields and run to see a preview
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/reports/${id}?run=1`)}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Run Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
