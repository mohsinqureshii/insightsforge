'use client'

import { useState, useEffect } from 'react'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { RefreshCw, Clock } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'

interface RefreshTimestampWidgetProps {
  widget: WidgetConfig
}

export function RefreshTimestampWidget({ widget }: RefreshTimestampWidgetProps) {
  const [, setTick] = useState(0)
  const label = (widget.displayConfig.label as string) ?? 'Last updated'
  const timestamp = widget.displayConfig.timestamp as string | undefined

  // Update every 30s to keep relative time fresh
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const lastUpdated = timestamp ? new Date(timestamp) : new Date()

  return (
    <div className="flex items-center justify-center h-full gap-2 text-sm text-muted-foreground p-3">
      <Clock className="h-4 w-4 shrink-0" />
      <span>
        {label}: <strong className="text-foreground">{formatRelativeTime(lastUpdated)}</strong>
      </span>
      <RefreshCw className="h-3 w-3 opacity-50" />
    </div>
  )
}
