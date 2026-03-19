'use client'

import { cn } from '@/lib/utils'
import type { ChartType } from '@/types/insightsforge'
import {
  Table2,
  BarChart2,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Gauge,
  LayoutGrid,
  Filter,
  TrendingUp,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Extended chart type options presented in the builder UI.
// These include both canonical ChartType values and common underscore aliases
// used at the report-definition level.
// ---------------------------------------------------------------------------

type UiChartType = ChartType | 'table' | 'kpi' | 'bar_chart' | 'line_chart' | 'pie_chart' | 'area_chart' | 'scatter_plot'

interface ChartOption {
  type: UiChartType
  label: string
  Icon: React.ComponentType<{ className?: string }>
}

const CHART_OPTIONS: ChartOption[] = [
  { type: 'table',        label: 'Table',       Icon: Table2       },
  { type: 'bar_chart',    label: 'Bar Chart',   Icon: BarChart2    },
  { type: 'line_chart',   label: 'Line Chart',  Icon: LineChart    },
  { type: 'pie_chart',    label: 'Pie Chart',   Icon: PieChart     },
  { type: 'area_chart',   label: 'Area Chart',  Icon: AreaChart    },
  { type: 'scatter_plot', label: 'Scatter',     Icon: ScatterChart },
  { type: 'kpi',          label: 'KPI',         Icon: TrendingUp   },
  { type: 'gauge',        label: 'Gauge',       Icon: Gauge        },
  { type: 'heatmap',      label: 'Heatmap',     Icon: LayoutGrid   },
  { type: 'funnel',       label: 'Funnel',      Icon: Filter       },
]

interface ChartTypeSelectorProps {
  value: UiChartType
  onChange: (type: UiChartType) => void
}

export function ChartTypeSelector({ value, onChange }: ChartTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
      {CHART_OPTIONS.map(({ type, label, Icon }) => {
        const isSelected = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors',
              'hover:border-primary/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border bg-background text-muted-foreground',
            )}
            aria-pressed={isSelected}
          >
            <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
            <span className="text-xs font-medium leading-none">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
