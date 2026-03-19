'use client'

import { useState, useEffect } from 'react'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { cn } from '@/lib/utils'

interface ClockWidgetProps {
  widget: WidgetConfig
}

export function ClockWidget({ widget }: ClockWidgetProps) {
  const [now, setNow] = useState(new Date())

  const timezone = (widget.displayConfig.timezone as string) ?? 'local'
  const showSeconds = (widget.displayConfig.showSeconds as boolean) ?? true
  const showDate = (widget.displayConfig.showDate as boolean) ?? true
  const format24h = (widget.displayConfig.format24h as boolean) ?? false
  const label = widget.displayConfig.label as string | undefined

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds && { second: '2-digit' }),
    hour12: !format24h,
    ...(timezone !== 'local' && { timeZone: timezone }),
  }

  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(timezone !== 'local' && { timeZone: timezone }),
  }

  const timeString = new Intl.DateTimeFormat('en-US', timeOptions).format(now)
  const dateString = new Intl.DateTimeFormat('en-US', dateOptions).format(now)

  const tzLabel =
    timezone !== 'local'
      ? new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: timezone })
          .formatToParts(now)
          .find((p) => p.type === 'timeZoneName')?.value ?? timezone
      : Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 gap-1">
      {label && (
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
          {label}
        </p>
      )}
      <div className="text-4xl font-mono font-bold tabular-nums tracking-tight">{timeString}</div>
      {showDate && (
        <div className="text-sm text-muted-foreground">{dateString}</div>
      )}
      <div className="text-xs text-muted-foreground/60 mt-1">{tzLabel}</div>
    </div>
  )
}
