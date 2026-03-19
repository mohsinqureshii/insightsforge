'use client'

import { useState, ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BarChart2,
  Type,
  Image,
  Clock,
  RefreshCw,
  Table2,
  Bell,
  ProgressIcon,
  Globe,
  Search,
  TrendingUp,
  FileText,
} from 'lucide-react'
import { type WidgetConfig } from '@/stores/dashboard.store'
import { v4 as uuidv4 } from 'uuid'
import { cn } from '@/lib/utils'
import type { Report } from '@/types/insightsforge'

// Using a workaround for ProgressIcon not existing in lucide
import { Activity } from 'lucide-react'

interface AddWidgetPanelProps {
  trigger: ReactNode
  onAdd: (widget: WidgetConfig) => void
}

interface WidgetType {
  type: WidgetConfig['type']
  label: string
  description: string
  icon: ReactNode
  defaultGridPos: { w: number; h: number }
  defaultConfig: Record<string, unknown>
}

const WIDGET_TYPES: WidgetType[] = [
  {
    type: 'kpi',
    label: 'KPI Card',
    description: 'Big number with trend and sparkline',
    icon: <TrendingUp className="h-5 w-5" />,
    defaultGridPos: { w: 2, h: 2 },
    defaultConfig: { label: 'Metric', format: 'number' },
  },
  {
    type: 'text',
    label: 'Text / Markdown',
    description: 'Rich text or markdown content',
    icon: <Type className="h-5 w-5" />,
    defaultGridPos: { w: 3, h: 2 },
    defaultConfig: { content: '## Heading\n\nAdd your text here...', align: 'left' },
  },
  {
    type: 'image',
    label: 'Image',
    description: 'Static image or logo',
    icon: <Image className="h-5 w-5" />,
    defaultGridPos: { w: 2, h: 2 },
    defaultConfig: { src: '', alt: 'Image', objectFit: 'contain' },
  },
  {
    type: 'clock',
    label: 'Clock',
    description: 'Live clock in any timezone',
    icon: <Clock className="h-5 w-5" />,
    defaultGridPos: { w: 2, h: 2 },
    defaultConfig: { timezone: 'local', showSeconds: true, showDate: true },
  },
  {
    type: 'refresh_timestamp',
    label: 'Last Updated',
    description: 'Shows when data was last refreshed',
    icon: <RefreshCw className="h-5 w-5" />,
    defaultGridPos: { w: 2, h: 1 },
    defaultConfig: { label: 'Last updated' },
  },
  {
    type: 'metric_table',
    label: 'Metric Comparison',
    description: 'Side-by-side metric comparison table',
    icon: <Table2 className="h-5 w-5" />,
    defaultGridPos: { w: 4, h: 3 },
    defaultConfig: { metrics: [] },
  },
  {
    type: 'alert_feed',
    label: 'Alert Feed',
    description: 'Scrolling event and alert feed',
    icon: <Bell className="h-5 w-5" />,
    defaultGridPos: { w: 3, h: 4 },
    defaultConfig: { maxItems: 20 },
  },
  {
    type: 'progress_group',
    label: 'Progress Bars',
    description: 'Multiple progress bar group',
    icon: <Activity className="h-5 w-5" />,
    defaultGridPos: { w: 3, h: 3 },
    defaultConfig: { items: [] },
  },
  {
    type: 'iframe',
    label: 'Embed / iFrame',
    description: 'Embed any URL in a sandboxed frame',
    icon: <Globe className="h-5 w-5" />,
    defaultGridPos: { w: 4, h: 4 },
    defaultConfig: { src: '', sandbox: 'allow-scripts allow-same-origin' },
  },
]

async function fetchReports(): Promise<Report[]> {
  const res = await fetch('/api/v1/reports?pageSize=50')
  if (!res.ok) return []
  const json = await res.json()
  return json.data ?? []
}

export function AddWidgetPanel({ trigger, onAdd }: AddWidgetPanelProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'reports' | 'widgets'>('reports')
  const [search, setSearch] = useState('')

  const { data: reports = [] } = useQuery({
    queryKey: ['reports-for-widget'],
    queryFn: fetchReports,
    enabled: open,
  })

  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  )

  const filteredWidgets = WIDGET_TYPES.filter(
    (w) =>
      w.label.toLowerCase().includes(search.toLowerCase()) ||
      w.description.toLowerCase().includes(search.toLowerCase()),
  )

  const handleAddReport = (report: Report) => {
    onAdd({
      id: uuidv4(),
      type: 'report',
      reportId: report.id,
      title: report.name,
      displayConfig: {
        mode: report.type === 'chart' ? 'chart' : 'table',
      },
      gridPos: { x: 0, y: 99, w: 4, h: 4 },
    })
    setOpen(false)
  }

  const handleAddWidget = (wType: WidgetType) => {
    onAdd({
      id: uuidv4(),
      type: wType.type,
      title: wType.label,
      displayConfig: wType.defaultConfig,
      gridPos: { x: 0, y: 99, ...wType.defaultGridPos },
    })
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle>Add Widget</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-3">
          <Button
            variant={tab === 'reports' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setTab('reports')}
          >
            <BarChart2 className="h-4 w-4 mr-2" />
            Reports
          </Button>
          <Button
            variant={tab === 'widgets' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => setTab('widgets')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Widgets
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tab === 'reports' ? 'Search reports...' : 'Search widgets...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {tab === 'reports' ? (
            filteredReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reports found</p>
                <p className="text-xs mt-1">Create reports first to add them to dashboards</p>
              </div>
            ) : (
              filteredReports.map((report) => (
                <button
                  key={report.id}
                  className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                  onClick={() => handleAddReport(report)}
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{report.name}</p>
                    {report.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {report.description}
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-1.5">
                      <Badge variant="secondary" className="text-xs h-4 px-1.5">
                        {report.type}
                      </Badge>
                      {report.chartType && (
                        <Badge variant="outline" className="text-xs h-4 px-1.5">
                          {report.chartType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )
          ) : (
            filteredWidgets.map((wType) => (
              <button
                key={wType.type}
                className="w-full flex items-start gap-3 p-3 rounded-lg border hover:border-primary/50 hover:bg-muted/50 transition-all text-left"
                onClick={() => handleAddWidget(wType)}
              >
                <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-500">
                  {wType.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{wType.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{wType.description}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Default: {wType.defaultGridPos.w}×{wType.defaultGridPos.h} grid
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
