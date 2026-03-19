'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy-load widget implementations to avoid a circular import with Widget.tsx
const ReportWidget = lazy(() =>
  import('@/components/dashboard/widgets/ReportWidget').then((m) => ({ default: m.ReportWidget })),
)
const KPIWidget = lazy(() =>
  import('@/components/dashboard/widgets/KPIWidget').then((m) => ({ default: m.KPIWidget })),
)
const TextWidget = lazy(() =>
  import('@/components/dashboard/widgets/TextWidget').then((m) => ({ default: m.TextWidget })),
)
const ImageWidget = lazy(() =>
  import('@/components/dashboard/widgets/ImageWidget').then((m) => ({ default: m.ImageWidget })),
)
const ClockWidget = lazy(() =>
  import('@/components/dashboard/widgets/ClockWidget').then((m) => ({ default: m.ClockWidget })),
)
const RefreshTimestampWidget = lazy(() =>
  import('@/components/dashboard/widgets/RefreshTimestampWidget').then((m) => ({
    default: m.RefreshTimestampWidget,
  })),
)
const MetricComparisonWidget = lazy(() =>
  import('@/components/dashboard/widgets/MetricComparisonWidget').then((m) => ({
    default: m.MetricComparisonWidget,
  })),
)
const AlertFeedWidget = lazy(() =>
  import('@/components/dashboard/widgets/AlertFeedWidget').then((m) => ({
    default: m.AlertFeedWidget,
  })),
)
const ProgressBarGroupWidget = lazy(() =>
  import('@/components/dashboard/widgets/ProgressBarGroupWidget').then((m) => ({
    default: m.ProgressBarGroupWidget,
  })),
)
const IFrameWidget = lazy(() =>
  import('@/components/dashboard/widgets/IFrameWidget').then((m) => ({ default: m.IFrameWidget })),
)

interface WidgetExpandModalProps {
  open: boolean
  onClose: () => void
  widget: WidgetConfig
}

// Expand the widget's grid position so widget implementations that derive
// size from gridPos will render in their "large" state.
function expandedWidget(widget: WidgetConfig): WidgetConfig {
  return { ...widget, gridPos: { x: 0, y: 0, w: 12, h: 8 } }
}

const LARGE_DIMENSIONS = { width: 1200, height: 640 }

function ExpandedWidgetContent({ widget }: { widget: WidgetConfig }) {
  const w = expandedWidget(widget)

  switch (w.type) {
    case 'report':
      return <ReportWidget widget={w} dimensions={LARGE_DIMENSIONS} isRefreshing={false} />
    case 'kpi':
      return <KPIWidget widget={w} dimensions={LARGE_DIMENSIONS} />
    case 'text':
      return <TextWidget widget={w} />
    case 'image':
      return <ImageWidget widget={w} />
    case 'clock':
      return <ClockWidget widget={w} />
    case 'refresh_timestamp':
      return <RefreshTimestampWidget widget={w} />
    case 'metric_table':
      return <MetricComparisonWidget widget={w} />
    case 'alert_feed':
      return <AlertFeedWidget widget={w} />
    case 'progress_group':
      return <ProgressBarGroupWidget widget={w} />
    case 'iframe':
      return <IFrameWidget widget={w} />
    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Unknown widget type: {w.type}
        </div>
      )
  }
}

export function WidgetExpandModal({ open, onClose, widget }: WidgetExpandModalProps) {
  const displayTitle = widget.titleOverride ?? widget.title ?? 'Widget'

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="max-w-6xl w-full h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{displayTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden relative">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <ExpandedWidgetContent widget={widget} />
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  )
}
