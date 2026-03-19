'use client'

import { type WidgetConfig } from '@/stores/dashboard.store'
import { cn } from '@/lib/utils'

interface ProgressItem {
  label: string
  value: number
  max: number
  color?: string
}

interface ProgressBarGroupWidgetProps {
  widget: WidgetConfig
}

const DEFAULT_ITEMS: ProgressItem[] = [
  { label: 'Organic', value: 4200, max: 6000, color: '#6366f1' },
  { label: 'Paid', value: 2800, max: 6000, color: '#10b981' },
  { label: 'Referral', value: 1500, max: 6000, color: '#f59e0b' },
  { label: 'Direct', value: 900, max: 6000, color: '#3b82f6' },
]

function formatValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

export function ProgressBarGroupWidget({ widget }: ProgressBarGroupWidgetProps) {
  const items = (widget.displayConfig.items as ProgressItem[] | undefined) ?? DEFAULT_ITEMS

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data configured
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full p-4 gap-3 overflow-y-auto">
      {items.map((item, index) => {
        const percentage = item.max > 0 ? Math.min(100, (item.value / item.max) * 100) : 0
        const barColor = item.color ?? '#6366f1'

        return (
          <div key={`${item.label}-${index}`} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate">{item.label}</span>
              <span className="text-muted-foreground ml-2 shrink-0">
                {formatValue(item.value)}{' '}
                <span className="text-xs">/ {formatValue(item.max)}</span>
              </span>
            </div>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all duration-500')}
                style={{
                  width: `${percentage}%`,
                  backgroundColor: barColor,
                }}
                role="progressbar"
                aria-valuenow={item.value}
                aria-valuemin={0}
                aria-valuemax={item.max}
                aria-label={item.label}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(0)}%</p>
          </div>
        )
      })}
    </div>
  )
}
