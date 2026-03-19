'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useDashboardStore, type WidgetConfig } from '@/stores/dashboard.store'
import {
  Maximize2,
  MoreVertical,
  Settings2,
  Copy,
  Trash2,
  GripVertical,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { WidgetExpandModal } from '@/components/dashboard/WidgetExpandModal'
import { ReportWidget } from '@/components/dashboard/widgets/ReportWidget'
import { KPIWidget } from '@/components/dashboard/widgets/KPIWidget'
import { TextWidget } from '@/components/dashboard/widgets/TextWidget'
import { ImageWidget } from '@/components/dashboard/widgets/ImageWidget'
import { ClockWidget } from '@/components/dashboard/widgets/ClockWidget'
import { RefreshTimestampWidget } from '@/components/dashboard/widgets/RefreshTimestampWidget'
import { MetricComparisonWidget } from '@/components/dashboard/widgets/MetricComparisonWidget'
import { AlertFeedWidget } from '@/components/dashboard/widgets/AlertFeedWidget'
import { ProgressBarGroupWidget } from '@/components/dashboard/widgets/ProgressBarGroupWidget'
import { IFrameWidget } from '@/components/dashboard/widgets/IFrameWidget'
import { cn } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

interface WidgetProps {
  widget: WidgetConfig
}

export function Widget({ widget }: WidgetProps) {
  const { isEditMode, removeWidget, addWidget, updateWidget } = useDashboardStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const displayTitle = widget.titleOverride ?? widget.title ?? 'Widget'

  // Observe size changes
  useEffect(() => {
    if (!containerRef.current) return
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    resizeObserverRef.current.observe(containerRef.current)
    return () => resizeObserverRef.current?.disconnect()
  }, [])

  const handleDuplicate = useCallback(() => {
    addWidget({
      ...widget,
      id: uuidv4(),
      gridPos: {
        ...widget.gridPos,
        y: widget.gridPos.y + widget.gridPos.h,
      },
    })
    toast.success('Widget duplicated')
  }, [widget, addWidget])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await new Promise((r) => setTimeout(r, 1200))
    setIsRefreshing(false)
    toast.success('Widget refreshed')
  }, [])

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'report':
        return (
          <ReportWidget
            widget={widget}
            dimensions={dimensions}
            isRefreshing={isRefreshing}
          />
        )
      case 'kpi':
        return <KPIWidget widget={widget} dimensions={dimensions} />
      case 'text':
        return <TextWidget widget={widget} />
      case 'image':
        return <ImageWidget widget={widget} />
      case 'clock':
        return <ClockWidget widget={widget} />
      case 'refresh_timestamp':
        return <RefreshTimestampWidget widget={widget} />
      case 'metric_table':
        return <MetricComparisonWidget widget={widget} />
      case 'alert_feed':
        return <AlertFeedWidget widget={widget} />
      case 'progress_group':
        return <ProgressBarGroupWidget widget={widget} />
      case 'iframe':
        return <IFrameWidget widget={widget} />
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Unknown widget type: {widget.type}
          </div>
        )
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className={cn(
          'relative flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden group/widget',
          isEditMode && 'cursor-default',
          isRefreshing && 'animate-pulse-border',
        )}
        onDoubleClick={() => !isEditMode && setIsExpanded(true)}
      >
        {/* Title bar */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 border-b bg-muted/30 min-h-[40px] shrink-0',
            isEditMode && 'widget-drag-handle cursor-grab active:cursor-grabbing',
          )}
        >
          {isEditMode && (
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          <span className="text-sm font-medium truncate flex-1">{displayTitle}</span>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover/widget:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleRefresh}
            >
              <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(true)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            {isEditMode && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => {
                      // Open widget config panel
                    }}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => removeWidget(widget.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Widget content */}
        <div className="flex-1 overflow-hidden relative">
          {renderWidgetContent()}
          {/* Refresh overlay */}
          {isRefreshing && (
            <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>

        {/* Edit mode resize indicator */}
        {isEditMode && (
          <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground/50 pointer-events-none">
            {widget.gridPos.w}×{widget.gridPos.h}
          </div>
        )}
      </div>

      {/* Expand modal */}
      <WidgetExpandModal
        open={isExpanded}
        onClose={() => setIsExpanded(false)}
        widget={widget}
      />
    </>
  )
}
