'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  Edit2,
  Share2,
  Download,
  RefreshCw,
  Clock,
  Database,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'
import type { Report, QueryResult } from '@/types/insightsforge'

interface ReportWithDataSource extends Report {
  dataSource?: { id: string; name: string; type: string } | null
}

async function fetchReport(id: string): Promise<ReportWithDataSource> {
  const res = await fetch(`/api/v1/reports/${id}`)
  if (!res.ok) throw new Error('Report not found')
  const json = await res.json()
  return json.data
}

async function runReport(id: string): Promise<QueryResult> {
  const res = await fetch(`/api/v1/reports/${id}/run`, { method: 'POST' })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Failed to run report')
  }
  const json = await res.json()
  return json.data
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-24" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Skeleton className="h-[400px] w-full rounded-xl" />
    </div>
  )
}

function TableResult({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        No rows returned
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0">
          <tr>
            {result.columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {result.rows.map((row, i) => (
            <tr key={i} className="hover:bg-muted/30 transition-colors">
              {result.columns.map((col) => (
                <td key={col} className="whitespace-nowrap px-4 py-2.5">
                  {row[col] === null || row[col] === undefined ? (
                    <span className="text-muted-foreground italic">null</span>
                  ) : (
                    String(row[col])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {result.truncated && (
        <div className="border-t bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Results truncated – showing {result.rowCount.toLocaleString()} rows
        </div>
      )}
    </div>
  )
}

function ChartPlaceholder({ type }: { type: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <BarChart3 className="mb-3 h-12 w-12 text-muted-foreground" />
      <p className="text-sm font-medium">Chart: {type}</p>
      <p className="mt-1 text-xs text-muted-foreground">Chart rendering coming soon</p>
    </div>
  )
}

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [runCount, setRunCount] = useState(0)

  const {
    data: report,
    isLoading: loadingReport,
    error: reportError,
  } = useQuery({
    queryKey: ['report', id],
    queryFn: () => fetchReport(id),
    enabled: !!id,
  })

  const {
    data: result,
    isLoading: loadingResult,
    error: resultError,
  } = useQuery({
    queryKey: ['report-result', id, runCount],
    queryFn: () => runReport(id),
    enabled: !!report,
    retry: false,
  })

  const handleRefresh = useCallback(() => {
    setRunCount((n) => n + 1)
  }, [])

  const handleShare = useCallback(() => {
    toast.info('Share functionality coming soon')
  }, [])

  const handleExport = useCallback(() => {
    toast.info('Export functionality coming soon')
  }, [])

  if (loadingReport) return <ReportSkeleton />

  if (reportError || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-lg font-semibold">Report not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This report may have been deleted or you don&apos;t have access.
        </p>
        <Button className="mt-4" asChild>
          <Link href="/reports">Back to Reports</Link>
        </Button>
      </div>
    )
  }

  const isChartType = report.type === 'chart'
  const isTableType = report.type === 'table' || report.type === 'pivot' || report.type === 'custom_sql'

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/reports')} className="shrink-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Reports
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{report.name}</h1>
            <Badge variant="secondary" className="capitalize shrink-0">
              {report.type.replace('_', ' ')}
            </Badge>
            <Badge
              variant={report.visibility === 'private' ? 'outline' : 'secondary'}
              className="capitalize shrink-0"
            >
              {report.visibility}
            </Badge>
          </div>
          {report.description && (
            <p className="mt-0.5 text-sm text-muted-foreground truncate">{report.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingResult}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loadingResult ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" asChild>
            <Link href={`/reports/${report.id}/edit`}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {report.dataSource && (
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            <span>{report.dataSource.name}</span>
          </div>
        )}
        {report.lastRunAt && (
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>Last run {formatRelativeTime(report.lastRunAt)}</span>
          </div>
        )}
        {result && (
          <div className="flex items-center gap-1.5">
            <span>{result.rowCount.toLocaleString()} rows</span>
            <span>·</span>
            <span>{result.durationMs}ms</span>
          </div>
        )}
      </div>

      {/* Results */}
      <Card>
        <CardContent className="p-0 overflow-hidden rounded-xl">
          {loadingResult ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : resultError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-destructive">Failed to run report</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {resultError instanceof Error ? resultError.message : 'Unknown error'}
              </p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : result ? (
            isTableType ? (
              <TableResult result={result} />
            ) : isChartType ? (
              <ChartPlaceholder type={report.chartType ?? 'bar'} />
            ) : (
              <ChartPlaceholder type={report.type} />
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
