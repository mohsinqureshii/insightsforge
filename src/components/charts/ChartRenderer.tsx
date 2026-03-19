'use client'

import dynamic from 'next/dynamic'
import type { ChartConfig, QueryResult } from '@/lib/query-engine/types'
import { TableChart } from './TableChart'
import { KPIChart } from './KPIChart'

// Load EChartWrapper only on the client – ECharts touches window/canvas APIs.
const EChartWrapper = dynamic(() => import('./EChartWrapper'), { ssr: false })

// Extended chart type string to support the full set used in the report builder UI.
// The core ChartType from insightsforge.ts covers the canonical set; this union
// also covers the underscore-suffixed aliases used in ChartConfig.type at runtime.
type AnyChartType = ChartConfig['type'] | string

interface ChartRendererProps {
  config: ChartConfig
  data: QueryResult
  height?: number
}

const ECHART_TYPES: AnyChartType[] = [
  // canonical
  'bar',
  'line',
  'area',
  'pie',
  'donut',
  'scatter',
  'bubble',
  'heatmap',
  'treemap',
  'funnel',
  'gauge',
  'sankey',
  'radar',
  // underscore-aliased variants used in report-builder UI
  'bar_chart',
  'line_chart',
  'pie_chart',
  'area_chart',
  'scatter_plot',
]

export function ChartRenderer({ config, data, height = 400 }: ChartRendererProps) {
  const type = config.type as AnyChartType

  if (type === 'table') {
    return <TableChart data={data} />
  }

  if (type === 'kpi') {
    return <KPIChart config={config} data={data} />
  }

  if (ECHART_TYPES.includes(type)) {
    return (
      <EChartWrapper
        type={config.type}
        config={config}
        data={data}
        height={height}
      />
    )
  }

  return (
    <div className="flex items-center justify-center rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground"
      style={{ height }}
    >
      Chart type not supported: <span className="ml-1 font-mono font-semibold">{String(type)}</span>
    </div>
  )
}
