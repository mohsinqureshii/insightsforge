'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChartConfig, QueryResult, ColorThreshold } from '@/lib/query-engine/types'

interface KPIChartProps {
  config: ChartConfig
  data: QueryResult
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatKpiValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)

  // Use compact notation for large numbers
  if (Math.abs(num) >= 1_000_000) {
    return (num / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'M'
  }
  if (Math.abs(num) >= 1_000) {
    return (num / 1_000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K'
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

function evaluateThresholds(
  value: number,
  thresholds: ColorThreshold[],
): 'red' | 'amber' | 'green' | null {
  for (const t of thresholds) {
    let match = false
    switch (t.operator) {
      case '<':
        match = value < t.value
        break
      case '<=':
        match = value <= t.value
        break
      case '>':
        match = value > t.value
        break
      case '>=':
        match = value >= t.value
        break
      case '=':
        match = value === t.value
        break
    }
    if (match) return t.color
  }
  return null
}

const COLOR_CLASS_MAP: Record<'red' | 'amber' | 'green', string> = {
  red: 'text-red-500',
  amber: 'text-amber-500',
  green: 'text-green-500',
}

// ---------------------------------------------------------------------------
// KPIChart
// ---------------------------------------------------------------------------

export function KPIChart({ config, data }: KPIChartProps) {
  const firstRow = data.rows[0]
  const numericColumn = data.columns.find((c) => c.type === 'number') ?? data.columns[0]
  const mainValue = firstRow && numericColumn ? firstRow[numericColumn.field] : null
  const numericValue = mainValue !== null && mainValue !== undefined ? Number(mainValue) : null

  // Trend calculation
  let trendPercent: number | null = null
  let trendDirection: 'up' | 'down' | 'flat' = 'flat'

  if (config.trendField && firstRow) {
    const trendRaw = firstRow[config.trendField]
    if (trendRaw !== null && trendRaw !== undefined) {
      trendPercent = Number(trendRaw)
      if (!Number.isNaN(trendPercent)) {
        trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'flat'
      }
    }
  } else if (data.rows.length > 1 && numericColumn) {
    // Compute trend from first two rows if no explicit trendField
    const prev = Number(data.rows[1]?.[numericColumn.field] ?? 0)
    const curr = numericValue ?? 0
    if (prev !== 0) {
      trendPercent = ((curr - prev) / Math.abs(prev)) * 100
      trendDirection = trendPercent > 0 ? 'up' : trendPercent < 0 ? 'down' : 'flat'
    }
  }

  // Color threshold evaluation
  let thresholdColor: string | null = null
  if (config.colorThresholds && numericValue !== null) {
    const color = evaluateThresholds(numericValue, config.colorThresholds)
    if (color) thresholdColor = COLOR_CLASS_MAP[color]
  }

  const sizeClass =
    config.kpiSize === 'small'
      ? 'text-3xl'
      : config.kpiSize === 'large'
        ? 'text-7xl'
        : 'text-5xl'

  const TrendIcon =
    trendDirection === 'up'
      ? TrendingUp
      : trendDirection === 'down'
        ? TrendingDown
        : Minus

  const trendColorClass =
    trendDirection === 'up'
      ? 'text-green-500'
      : trendDirection === 'down'
        ? 'text-red-500'
        : 'text-muted-foreground'

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6">
      {/* Label */}
      <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        {numericColumn?.label ?? 'Value'}
      </p>

      {/* Main value */}
      <p
        className={cn(
          'font-bold leading-none tabular-nums',
          sizeClass,
          thresholdColor ?? 'text-foreground',
        )}
      >
        {formatKpiValue(mainValue)}
      </p>

      {/* Trend indicator */}
      {trendPercent !== null && (
        <div className={cn('flex items-center gap-1 text-sm font-medium', trendColorClass)}>
          <TrendIcon className="h-4 w-4" />
          <span>
            {Math.abs(trendPercent).toLocaleString(undefined, { maximumFractionDigits: 1 })}%
          </span>
        </div>
      )}

      {/* Target comparison */}
      {config.targetValue !== undefined && numericValue !== null && (
        <p className="text-xs text-muted-foreground">
          Target:{' '}
          <span className="font-semibold">{formatKpiValue(config.targetValue)}</span>
          {' '}
          {numericValue >= config.targetValue ? (
            <span className="text-green-500">Achieved</span>
          ) : (
            <span className="text-amber-500">
              {formatKpiValue(config.targetValue - numericValue)} remaining
            </span>
          )}
        </p>
      )}
    </div>
  )
}
