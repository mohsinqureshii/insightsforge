'use client'

import { X, SlidersHorizontal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardStore } from '@/stores/dashboard.store'

function formatFilterValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>
    // Handle date range objects
    if ('from' in obj || 'start' in obj) {
      const from = (obj.from ?? obj.start) as string | undefined
      const to = (obj.to ?? obj.end) as string | undefined
      if (from && to) return `${from} – ${to}`
      if (from) return `From ${from}`
      if (to) return `Until ${to}`
    }
  }
  if (Array.isArray(value)) return value.join(', ')
  return JSON.stringify(value)
}

function formatFilterLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DashboardFilterBar() {
  const { dashboardFilters, filterOverrides, setFilterOverride, resetFilterOverrides } =
    useDashboardStore()

  // Merge dashboard-level filters with any overrides
  const allFilters: Record<string, unknown> = { ...dashboardFilters, ...filterOverrides }
  const filterEntries = Object.entries(allFilters).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  )

  if (filterEntries.length === 0) return null

  return (
    <div className="flex items-center gap-2 flex-wrap px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="font-medium">Filters:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap flex-1">
        {filterEntries.map(([key, value]) => {
          const isOverride = key in filterOverrides
          return (
            <Badge
              key={key}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-xs"
            >
              <span className="font-medium">{formatFilterLabel(key)}:</span>
              <span className="text-muted-foreground">{formatFilterValue(value)}</span>
              {isOverride && (
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 transition-colors"
                  onClick={() => setFilterOverride(key, undefined)}
                  aria-label={`Remove ${formatFilterLabel(key)} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )
        })}
      </div>

      {Object.keys(filterOverrides).length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-muted-foreground px-2"
          onClick={resetFilterOverrides}
        >
          Clear overrides
        </Button>
      )}
    </div>
  )
}
