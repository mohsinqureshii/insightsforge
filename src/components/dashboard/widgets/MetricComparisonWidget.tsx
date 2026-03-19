'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { cn } from '@/lib/utils'

interface MetricComparisonConfig {
  current: number
  previous: number
  label: string
  format?: 'number' | 'currency' | 'percent'
  currencySymbol?: string
  previousLabel?: string
  currentLabel?: string
}

interface MetricComparisonWidgetProps {
  widget: WidgetConfig
}

function formatValue(
  value: number,
  format: MetricComparisonConfig['format'] = 'number',
  symbol = '$',
): string {
  switch (format) {
    case 'currency':
      return `${symbol}${new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
        notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
      }).format(value)}`
    case 'percent':
      return `${value.toFixed(1)}%`
    default:
      return new Intl.NumberFormat('en-US', {
        notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
        maximumFractionDigits: 2,
      }).format(value)
  }
}

function calculateChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function MetricComparisonWidget({ widget }: MetricComparisonWidgetProps) {
  const config = widget.displayConfig as Partial<MetricComparisonConfig>

  const current = config.current ?? 0
  const previous = config.previous ?? 0
  const label = config.label ?? 'Metric'
  const format = config.format ?? 'number'
  const currencySymbol = config.currencySymbol ?? '$'
  const currentLabel = config.currentLabel ?? 'Current'
  const previousLabel = config.previousLabel ?? 'Previous'

  const changePercent = calculateChange(current, previous)
  const isUp = changePercent !== null && changePercent > 0
  const isDown = changePercent !== null && changePercent < 0

  return (
    <div className="flex flex-col justify-center h-full p-4 gap-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>

      <div className="grid grid-cols-2 gap-4">
        {/* Current metric */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{currentLabel}</p>
          <p className="text-2xl font-bold tracking-tight">
            {formatValue(current, format, currencySymbol)}
          </p>
        </div>

        {/* Previous metric */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{previousLabel}</p>
          <p className="text-2xl font-bold tracking-tight text-muted-foreground">
            {formatValue(previous, format, currencySymbol)}
          </p>
        </div>
      </div>

      {/* Percentage change */}
      {changePercent !== null && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            isUp && 'text-emerald-600',
            isDown && 'text-red-500',
            !isUp && !isDown && 'text-muted-foreground',
          )}
        >
          {isUp && <TrendingUp className="h-4 w-4" />}
          {isDown && <TrendingDown className="h-4 w-4" />}
          {!isUp && !isDown && <Minus className="h-4 w-4" />}
          <span>
            {changePercent > 0 ? '+' : ''}
            {changePercent.toFixed(1)}% vs {previousLabel.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  )
}
