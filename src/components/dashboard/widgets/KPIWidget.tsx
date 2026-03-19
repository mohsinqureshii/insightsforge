'use client'

import { useQuery } from '@tanstack/react-query'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { TrendingUp, TrendingDown, Minus, Loader2, AlertCircle } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { cn } from '@/lib/utils'

interface KPIWidgetProps {
  widget: WidgetConfig
  dimensions: { width: number; height: number }
}

interface KPIData {
  value: number
  previousValue?: number
  target?: number
  label: string
  format: 'number' | 'currency' | 'percent' | 'duration'
  currencySymbol?: string
  sparkline?: number[]
  trend?: 'up' | 'down' | 'neutral'
  changePercent?: number
  changeAbsolute?: number
  invertColors?: boolean
}

async function fetchKPIData(reportId: string): Promise<KPIData> {
  const res = await fetch(`/api/v1/reports/${reportId}/kpi`)
  if (!res.ok) throw new Error('Failed to fetch KPI')
  const json = await res.json()
  return json.data
}

function formatValue(value: number, format: KPIData['format'], symbol = '$'): string {
  switch (format) {
    case 'currency':
      return `${symbol}${new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
        notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
      }).format(value)}`
    case 'percent':
      return `${value.toFixed(1)}%`
    case 'duration':
      if (value < 60) return `${value.toFixed(0)}s`
      if (value < 3600) return `${(value / 60).toFixed(1)}m`
      return `${(value / 3600).toFixed(1)}h`
    default:
      return new Intl.NumberFormat('en-US', {
        notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
        maximumFractionDigits: 2,
      }).format(value)
  }
}

function SparklineChart({ data, color }: { data: number[]; color: string }) {
  const option = {
    grid: { top: 2, right: 2, bottom: 2, left: 2 },
    xAxis: { type: 'category', show: false, data: data.map((_, i) => i) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'line',
        data,
        smooth: true,
        showSymbol: false,
        lineStyle: { color, width: 2 },
        areaStyle: { color, opacity: 0.15 },
      },
    ],
  }
  return (
    <ReactECharts
      option={option}
      style={{ height: 40, width: '100%' }}
      opts={{ renderer: 'svg' }}
      notMerge
    />
  )
}

type KPISize = 'small' | 'medium' | 'large'

function getSize(w: number, h: number): KPISize {
  if (w >= 4 && h >= 3) return 'large'
  if (w >= 2 || h >= 2) return 'medium'
  return 'small'
}

export function KPIWidget({ widget, dimensions }: KPIWidgetProps) {
  const reportId = widget.reportId
  const size = getSize(widget.gridPos.w, widget.gridPos.h)

  // Mock data for widgets without a reportId
  const mockData: KPIData = {
    value: widget.displayConfig.value as number ?? 12_430,
    previousValue: widget.displayConfig.previousValue as number ?? 11_200,
    target: widget.displayConfig.target as number ?? 15_000,
    label: widget.displayConfig.label as string ?? 'Total Revenue',
    format: (widget.displayConfig.format as KPIData['format']) ?? 'currency',
    currencySymbol: '$',
    sparkline: [82, 91, 85, 99, 88, 104, 120, 115, 124, 131, 119, 124],
    changePercent: 10.98,
    trend: 'up',
    invertColors: false,
  }

  const { data: fetchedData, isLoading, error } = useQuery({
    queryKey: ['kpi-data', reportId],
    queryFn: () => fetchKPIData(reportId!),
    enabled: !!reportId,
    staleTime: 60_000,
  })

  const kpi = reportId && fetchedData ? fetchedData : mockData

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm text-muted-foreground">Failed to load KPI</span>
      </div>
    )
  }

  const trendIsPositive = kpi.trend === 'up'
  const trendIsNegative = kpi.trend === 'down'
  const isGood = kpi.invertColors ? trendIsNegative : trendIsPositive
  const isBad = kpi.invertColors ? trendIsPositive : trendIsNegative

  const targetPercent = kpi.target
    ? Math.min(100, Math.round((kpi.value / kpi.target) * 100))
    : null

  return (
    <div
      className={cn(
        'flex flex-col h-full p-4',
        size === 'large' && 'p-6',
        size === 'small' && 'p-3',
      )}
    >
      <p
        className={cn(
          'text-sm text-muted-foreground font-medium truncate',
          size === 'large' && 'text-base',
          size === 'small' && 'text-xs',
        )}
      >
        {kpi.label}
      </p>

      <div className="flex-1 flex flex-col justify-center">
        <div
          className={cn(
            'font-bold tracking-tight',
            size === 'large' && 'text-5xl',
            size === 'medium' && 'text-3xl',
            size === 'small' && 'text-2xl',
          )}
        >
          {formatValue(kpi.value, kpi.format, kpi.currencySymbol)}
        </div>

        {/* Trend & change */}
        {kpi.changePercent !== undefined && size !== 'small' && (
          <div className="flex items-center gap-2 mt-2">
            <div
              className={cn(
                'flex items-center gap-1 text-sm font-medium',
                isGood && 'text-emerald-600',
                isBad && 'text-red-500',
                !isGood && !isBad && 'text-muted-foreground',
              )}
            >
              {trendIsPositive && <TrendingUp className="h-4 w-4" />}
              {trendIsNegative && <TrendingDown className="h-4 w-4" />}
              {!trendIsPositive && !trendIsNegative && <Minus className="h-4 w-4" />}
              {Math.abs(kpi.changePercent).toFixed(1)}%
            </div>
            {kpi.previousValue !== undefined && (
              <span className="text-xs text-muted-foreground">
                vs {formatValue(kpi.previousValue, kpi.format, kpi.currencySymbol)}
              </span>
            )}
          </div>
        )}

        {/* Target progress */}
        {targetPercent !== null && size === 'large' && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target progress</span>
              <span>{targetPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${targetPercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Target: {formatValue(kpi.target!, kpi.format, kpi.currencySymbol)}
            </p>
          </div>
        )}
      </div>

      {/* Sparkline */}
      {kpi.sparkline && kpi.sparkline.length > 0 && size !== 'small' && (
        <div className="mt-2">
          <SparklineChart
            data={kpi.sparkline}
            color={isGood ? '#10b981' : isBad ? '#ef4444' : '#6366f1'}
          />
        </div>
      )}
    </div>
  )
}
