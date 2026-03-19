'use client'

import { useQuery } from '@tanstack/react-query'
import { useDashboardStore, type WidgetConfig } from '@/stores/dashboard.store'
import ReactECharts from 'echarts-for-react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportWidgetProps {
  widget: WidgetConfig
  dimensions: { width: number; height: number }
  isRefreshing?: boolean
}

interface ReportData {
  columns: string[]
  rows: Record<string, unknown>[]
  chartConfig?: {
    type: string
    xAxis?: { field: string; label?: string }
    yAxis?: { field: string; label?: string }
    series?: Array<{ name: string; field: string }>
    smooth?: boolean
    stack?: boolean
    colors?: string[]
    legend?: boolean
  }
  reportType: string
}

async function fetchReportData(
  reportId: string,
  filterOverrides: Record<string, unknown>,
  activeFilters: Record<string, unknown>,
): Promise<ReportData> {
  const res = await fetch(`/api/v1/reports/${reportId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filterOverrides, activeFilters }),
  })
  if (!res.ok) throw new Error('Failed to execute report')
  const json = await res.json()
  return json.data
}

const CHART_COLORS = [
  '#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#ec4899',
]

function buildEChartsOption(data: ReportData): object {
  const { chartConfig, columns, rows } = data
  if (!chartConfig) return {}

  const type = chartConfig.type ?? 'bar'
  const xField = chartConfig.xAxis?.field ?? columns[0] ?? ''
  const seriesFields = chartConfig.series?.length
    ? chartConfig.series
    : [{ name: columns[1] ?? 'Value', field: columns[1] ?? '' }]

  const xData = rows.map((r) => String(r[xField] ?? ''))
  const colors = chartConfig.colors ?? CHART_COLORS

  if (type === 'pie' || type === 'donut') {
    const valueField = seriesFields[0]?.field ?? columns[1] ?? ''
    return {
      color: colors,
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: chartConfig.legend !== false ? { bottom: 0 } : undefined,
      series: [
        {
          type: 'pie',
          radius: type === 'donut' ? ['40%', '70%'] : '70%',
          data: rows.map((r) => ({
            name: String(r[xField] ?? ''),
            value: Number(r[valueField] ?? 0),
          })),
          label: { show: true, formatter: '{b}: {d}%' },
        },
      ],
    }
  }

  if (type === 'scatter') {
    const yField = seriesFields[0]?.field ?? columns[1] ?? ''
    return {
      color: colors,
      tooltip: { trigger: 'item' },
      xAxis: { type: 'value', name: chartConfig.xAxis?.label },
      yAxis: { type: 'value', name: chartConfig.yAxis?.label },
      series: [
        {
          type: 'scatter',
          data: rows.map((r) => [Number(r[xField] ?? 0), Number(r[yField] ?? 0)]),
          symbolSize: 10,
        },
      ],
    }
  }

  const seriesData = seriesFields.map((s, idx) => ({
    name: s.name,
    type: type === 'area' ? 'line' : type,
    data: rows.map((r) => Number(r[s.field] ?? 0)),
    smooth: chartConfig.smooth ?? false,
    stack: chartConfig.stack ? 'stack' : undefined,
    areaStyle: type === 'area' ? { opacity: 0.3 } : undefined,
    itemStyle: { color: colors[idx % colors.length] },
    lineStyle: type === 'line' || type === 'area' ? { width: 2 } : undefined,
  }))

  return {
    color: colors,
    tooltip: { trigger: 'axis' },
    legend: chartConfig.legend !== false ? { top: 0 } : undefined,
    grid: { top: chartConfig.legend !== false ? 36 : 8, right: 8, bottom: 24, left: 40 },
    xAxis: {
      type: 'category',
      data: xData,
      name: chartConfig.xAxis?.label,
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      name: chartConfig.yAxis?.label,
      axisLabel: { fontSize: 11 },
    },
    series: seriesData,
  }
}

export function ReportWidget({ widget, dimensions }: ReportWidgetProps) {
  const { filterOverrides, activeFilters } = useDashboardStore()
  const reportId = widget.reportId

  const activeFilterValues: Record<string, unknown> = {}
  Object.values(activeFilters).forEach((f) => {
    activeFilterValues[f.field] = f.value
  })

  const { data, isLoading, error } = useQuery({
    queryKey: ['widget-data', reportId, filterOverrides, activeFilterValues],
    queryFn: () => fetchReportData(reportId!, filterOverrides, activeFilterValues),
    enabled: !!reportId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  if (!reportId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No report selected
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2 p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">Failed to load report data</p>
      </div>
    )
  }

  const isChart = data.reportType === 'chart' && data.chartConfig
  const displayMode =
    (widget.displayConfig.mode as string) ?? (isChart ? 'chart' : 'table')

  if (displayMode === 'chart' && data.chartConfig) {
    const option = buildEChartsOption(data)
    return (
      <ReactECharts
        option={option}
        style={{ height: dimensions.height > 0 ? dimensions.height : 300, width: '100%' }}
        opts={{ renderer: 'svg' }}
        notMerge
        lazyUpdate
      />
    )
  }

  // Table display
  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
          <tr>
            {data.columns.map((col) => (
              <th key={col} className="text-left px-3 py-2 font-medium text-muted-foreground border-b">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.slice(0, 200).map((row, i) => (
            <tr
              key={i}
              className={cn(
                'border-b last:border-0 hover:bg-muted/40 transition-colors',
                i % 2 === 0 ? 'bg-background' : 'bg-muted/20',
              )}
            >
              {data.columns.map((col) => (
                <td key={col} className="px-3 py-1.5 truncate max-w-[200px]">
                  {String(row[col] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.rows.length > 200 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          Showing 200 of {data.rows.length} rows
        </p>
      )}
    </div>
  )
}
