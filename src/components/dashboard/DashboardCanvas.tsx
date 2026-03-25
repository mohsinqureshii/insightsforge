'use client'

import { useCallback, useMemo, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { useDashboardStore } from '@/stores/dashboard.store'
import { Widget } from '@/components/dashboard/Widget'
import { AddWidgetPanel } from '@/components/dashboard/AddWidgetPanel'
import { cn } from '@/lib/utils'
import type { Layout } from 'react-grid-layout'

const ResponsiveGridLayout = WidthProvider(Responsive)

const BREAKPOINTS = { xl: 1280, lg: 1024, md: 768, sm: 480, xs: 0 }
const COLS = { xl: 12, lg: 8, md: 4, sm: 2, xs: 1 }
const ROW_HEIGHT = 80

export function DashboardCanvas() {
  const { widgets, isEditMode, updateLayout, addWidget } = useDashboardStore()
  const containerRef = useRef<HTMLDivElement>(null)

  const layouts = useMemo(() => {
    const base = widgets.map((w) => ({
      i: w.id,
      x: w.gridPos.x,
      y: w.gridPos.y,
      w: w.gridPos.w,
      h: w.gridPos.h,
      minW: 1,
      minH: 1,
    }))
    // Generate responsive breakpoint layouts
    return {
      xl: base,
      lg: base.map((l) => ({
        ...l,
        x: Math.min(l.x, 7),
        w: Math.min(l.w, 8),
      })),
      md: base.map((l) => ({
        ...l,
        x: Math.min(l.x, 3),
        w: Math.min(l.w, 4),
      })),
      sm: base.map((l) => ({
        ...l,
        x: 0,
        w: 2,
      })),
      xs: base.map((l) => ({
        ...l,
        x: 0,
        w: 1,
      })),
    }
  }, [widgets])

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[]) => {
      if (!isEditMode) return
      updateLayout(
        currentLayout.map((l) => ({
          id: l.i,
          x: l.x,
          y: l.y,
          w: l.w,
          h: l.h,
        })),
      )
    },
    [isEditMode, updateLayout],
  )

  if (widgets.length === 0 && !isEditMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="text-muted-foreground">
          <p className="text-lg font-semibold">This dashboard is empty</p>
          <p className="text-sm mt-1">Enable edit mode to add widgets</p>
        </div>
      </div>
    )
  }

  if (widgets.length === 0 && isEditMode) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="text-muted-foreground">
          <p className="text-lg font-semibold">No widgets yet</p>
          <p className="text-sm mt-1">Add widgets from the panel below to get started</p>
        </div>
        <AddWidgetPanel
          trigger={
            <button className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              + Add Widget
            </button>
          }
          onAdd={(widget) => addWidget(widget)}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full min-h-[400px]',
        isEditMode && 'bg-dot-muted rounded-xl',
      )}
    >
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={BREAKPOINTS}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".widget-drag-handle"
        margin={[12, 12]}
        containerPadding={[0, 0]}
        resizeHandles={['se', 'e', 's']}
        useCSSTransforms
      >
        {widgets.map((widget) => (
          <div key={widget.id}>
            <Widget widget={widget} />
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Add widget button in edit mode */}
      {isEditMode && (
        <div className="mt-4 flex justify-center">
          <AddWidgetPanel
            trigger={
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-muted-foreground/30 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                <span className="text-lg leading-none">+</span>
                Add Widget
              </button>
            }
            onAdd={(widget) => addWidget(widget)}
          />
        </div>
      )}
    </div>
  )
}
