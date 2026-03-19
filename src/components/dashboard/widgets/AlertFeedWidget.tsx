'use client'

import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { cn } from '@/lib/utils'

interface AlertItem {
  id: string
  title: string
  severity: 'info' | 'warning' | 'error'
  time: string
}

interface AlertFeedWidgetProps {
  widget: WidgetConfig
}

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    label: 'Warning',
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-red-500',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    label: 'Error',
  },
} as const

const DEFAULT_ALERTS: AlertItem[] = [
  { id: '1', title: 'CPU usage exceeded 90%', severity: 'error', time: '2 min ago' },
  { id: '2', title: 'Deployment completed successfully', severity: 'info', time: '15 min ago' },
  { id: '3', title: 'Memory usage above threshold', severity: 'warning', time: '1 hr ago' },
  { id: '4', title: 'Scheduled backup completed', severity: 'info', time: '3 hr ago' },
]

export function AlertFeedWidget({ widget }: AlertFeedWidgetProps) {
  const data = (widget.displayConfig.alerts as AlertItem[] | undefined) ?? DEFAULT_ALERTS

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No alerts to display
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <ul className="divide-y divide-border">
        {data.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity]
          const Icon = config.icon

          return (
            <li key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
              <div className="shrink-0 mt-0.5">
                <Icon className={cn('h-4 w-4', config.iconClass)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{alert.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                      config.badgeClass,
                    )}
                  >
                    {config.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{alert.time}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
