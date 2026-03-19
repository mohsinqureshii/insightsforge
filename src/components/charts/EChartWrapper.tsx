'use client'

import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import type { ChartConfig, QueryResult } from '@/lib/query-engine/types'
import type { ChartType } from '@/types/insightsforge'

interface EChartWrapperProps {
  type: ChartType | string
  config: ChartConfig
  data: QueryResult
  height?: number
}

// ---------------------------------------------------------------------------
// Palette helpers
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
]

function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

// ---------------------------------------------------------------------------
// Option builders
// ---------------------------------------------------------------------------

function buildBarOption(config: ChartConfig, data: QueryResult, dark: boolean): EChartsOption {
  const xField = config.xAxisField ?? data.columns[0]?.field ?? ''
  const yFields =
    config.yAxisFields && config.yAxisFields.length > 0
      ? config.yAxisFields
      : data.columns.filter((c) => c.type === 'number').map((c) => c.field)

  const xValues = data.rows.map((r) => String(r[xField] ?? ''))
  const colors = config.colors ?? DEFAULT_COLORS

  const series = yFields.map((yField, idx) => {
    const col = data.columns.find((c) => c.field === yField)
    return {
      name: col?.label ?? yField,
      type: 'bar' as const,
      data: data.rows.map((r) => r[yField] ?? 0),
      itemStyle: { color: colors[idx % colors.length] },
      stack: config.stack ? 'total' : undefined,
      label: config.showDataLabels ? { show: true, position: 'top' as const } : undefined,
    }
  })

  const isHorizontal = config.orientation === 'horizontal'

  return {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: { trigger: 'axis' as const },
    legend: config.showLegend !== false
      ? { show: true, [config.legendPosition ?? 'bottom']: 0 }
      : { show: false },
    grid: { left: 40, right: 20, bottom: 60, top: 40, containLabel: true },
    xAxis: isHorizontal
      ? { type: 'value' as const }
      : { type: 'category' as const, data: xValues },
    yAxis: isHorizontal
      ? { type: 'category' as const, data: xValues }
      : { type: 'value' as const },
    series: isHorizontal
      ? series.map((s) => ({ ...s, type: 'bar' as const }))
      : series,
  } satisfies EChartsOption
}

function buildLineOption(
  config: ChartConfig,
  data: QueryResult,
  dark: boolean,
  filled: boolean,
): EChartsOption {
  const xField = config.xAxisField ?? data.columns[0]?.field ?? ''
  const yFields =
    config.yAxisFields && config.yAxisFields.length > 0
      ? config.yAxisFields
      : data.columns.filter((c) => c.type === 'number').map((c) => c.field)

  const xValues = data.rows.map((r) => String(r[xField] ?? ''))
  const colors = config.colors ?? DEFAULT_COLORS

  const series = yFields.map((yField, idx) => {
    const col = data.columns.find((c) => c.field === yField)
    return {
      name: col?.label ?? yField,
      type: 'line' as const,
      data: data.rows.map((r) => r[yField] ?? 0),
      smooth: config.smooth ?? false,
      itemStyle: { color: colors[idx % colors.length] },
      areaStyle: filled ? { opacity: 0.25 } : undefined,
      label: config.showDataLabels ? { show: true } : undefined,
    }
  })

  return {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: { trigger: 'axis' as const },
    legend: config.showLegend !== false
      ? { show: true, [config.legendPosition ?? 'bottom']: 0 }
      : { show: false },
    grid: { left: 40, right: 20, bottom: 60, top: 40, containLabel: true },
    xAxis: { type: 'category' as const, data: xValues, boundaryGap: !filled },
    yAxis: { type: 'value' as const },
    series,
  } satisfies EChartsOption
}

function buildPieOption(
  config: ChartConfig,
  data: QueryResult,
  dark: boolean,
  isDonut: boolean,
): EChartsOption {
  const labelField = config.labelField ?? data.columns[0]?.field ?? ''
  const valueField =
    (config.yAxisFields?.[0]) ??
    data.columns.find((c) => c.type === 'number')?.field ??
    data.columns[1]?.field ??
    ''

  const colors = config.colors ?? DEFAULT_COLORS
  const innerRadius = isDonut ? config.donutInnerRadius ?? 50 : 0

  const pieData = data.rows.map((r, idx) => ({
    name: String(r[labelField] ?? `Item ${idx + 1}`),
    value: r[valueField] ?? 0,
  }))

  return {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: { trigger: 'item' as const },
    legend: config.showLegend !== false
      ? { show: true, orient: 'vertical' as const, right: 10, top: 'center' as const }
      : { show: false },
    series: [
      {
        name: data.columns.find((c) => c.field === valueField)?.label ?? '',
        type: 'pie',
        radius: isDonut ? [`${innerRadius}%`, '70%'] : '70%',
        data: pieData,
        label: {
          show: true,
          formatter:
            config.labelFormat === 'percent'
              ? '{d}%'
              : config.labelFormat === 'both'
                ? '{b}: {d}%'
                : '{b}: {c}',
        },
      },
    ] as EChartsOption['series'],
  }
}

function buildScatterOption(config: ChartConfig, data: QueryResult, dark: boolean): EChartsOption {
  const xField = config.xAxisField ?? data.columns[0]?.field ?? ''
  const yField =
    (config.yAxisFields?.[0]) ??
    data.columns.find((c) => c.type === 'number' && c.field !== xField)?.field ??
    ''
  const colors = config.colors ?? DEFAULT_COLORS

  return {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: { trigger: 'item' as const },
    xAxis: { type: 'value' as const },
    yAxis: { type: 'value' as const },
    series: [
      {
        type: 'scatter' as const,
        data: data.rows.map((r) => [r[xField] ?? 0, r[yField] ?? 0]),
        itemStyle: { color: colors[0] },
      },
    ],
  } satisfies EChartsOption
}

function buildGaugeOption(config: ChartConfig, data: QueryResult): EChartsOption {
  const valueField =
    data.columns.find((c) => c.type === 'number')?.field ?? data.columns[0]?.field ?? ''
  const value = Number(data.rows[0]?.[valueField] ?? 0)
  const min = config.gaugeMin ?? 0
  const max = config.gaugeMax ?? 100

  return {
    backgroundColor: 'transparent',
    series: [
      {
        type: 'gauge' as const,
        min,
        max,
        data: [{ value, name: data.columns.find((c) => c.field === valueField)?.label ?? '' }],
        axisLine: {
          lineStyle: {
            width: 20,
            color: config.gaugeBands?.map((b) => [b.max / max, b.color]) ?? [
              [0.33, '#22c55e'],
              [0.66, '#f59e0b'],
              [1, '#ef4444'],
            ],
          },
        },
      },
    ],
  } satisfies EChartsOption
}

function buildFunnelOption(config: ChartConfig, data: QueryResult): EChartsOption {
  const labelField = config.labelField ?? data.columns[0]?.field ?? ''
  const valueField =
    (config.yAxisFields?.[0]) ??
    data.columns.find((c) => c.type === 'number')?.field ??
    ''
  const colors = config.colors ?? DEFAULT_COLORS

  return {
    backgroundColor: 'transparent',
    color: colors,
    tooltip: { trigger: 'item' as const },
    series: [
      {
        type: 'funnel' as const,
        data: data.rows.map((r) => ({
          name: String(r[labelField] ?? ''),
          value: r[valueField] ?? 0,
        })),
      },
    ],
  } satisfies EChartsOption
}

function buildHeatmapOption(config: ChartConfig, data: QueryResult): EChartsOption {
  const xField = config.heatmapXField ?? data.columns[0]?.field ?? ''
  const yField = config.heatmapYField ?? data.columns[1]?.field ?? ''
  const valueField = config.heatmapValueField ?? data.columns.find((c) => c.type === 'number')?.field ?? ''

  const xCategories = [...new Set(data.rows.map((r) => String(r[xField] ?? '')))]
  const yCategories = [...new Set(data.rows.map((r) => String(r[yField] ?? '')))]

  const heatData = data.rows.map((r) => [
    xCategories.indexOf(String(r[xField] ?? '')),
    yCategories.indexOf(String(r[yField] ?? '')),
    r[valueField] ?? 0,
  ])

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' as const },
    grid: { left: 60, bottom: 60, top: 20, right: 80, containLabel: true },
    xAxis: { type: 'category' as const, data: xCategories },
    yAxis: { type: 'category' as const, data: yCategories },
    visualMap: { min: 0, max: Math.max(...data.rows.map((r) => Number(r[valueField] ?? 0))), calculable: true },
    series: [{ type: 'heatmap' as const, data: heatData, label: { show: false } }],
  } satisfies EChartsOption
}

// ---------------------------------------------------------------------------
// Canonical chart-type normaliser
// ---------------------------------------------------------------------------

type NormalisedType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'gauge'
  | 'funnel'
  | 'heatmap'
  | 'radar'
  | 'treemap'
  | 'sankey'
  | 'bubble'
  | 'unknown'

function normaliseType(type: string): NormalisedType {
  const map: Record<string, NormalisedType> = {
    bar: 'bar',
    bar_chart: 'bar',
    line: 'line',
    line_chart: 'line',
    area: 'area',
    area_chart: 'area',
    pie: 'pie',
    pie_chart: 'pie',
    donut: 'donut',
    scatter: 'scatter',
    scatter_plot: 'scatter',
    bubble: 'bubble',
    gauge: 'gauge',
    funnel: 'funnel',
    heatmap: 'heatmap',
    treemap: 'treemap',
    sankey: 'sankey',
    radar: 'radar',
  }
  return map[type] ?? 'unknown'
}

// ---------------------------------------------------------------------------
// EChartWrapper component
// ---------------------------------------------------------------------------

export default function EChartWrapper({
  type,
  config,
  data,
  height = 400,
}: EChartWrapperProps) {
  const dark = isDarkMode()

  const option = useMemo<EChartsOption>(() => {
    const norm = normaliseType(String(type))

    if (data.rows.length === 0) {
      return {
        title: {
          text: 'No data',
          left: 'center' as const,
          top: 'middle' as const,
          textStyle: { color: dark ? '#888' : '#999', fontSize: 14 },
        },
      }
    }

    switch (norm) {
      case 'bar':
        return buildBarOption(config, data, dark)
      case 'line':
        return buildLineOption(config, data, dark, false)
      case 'area':
        return buildLineOption(config, data, dark, true)
      case 'pie':
        return buildPieOption(config, data, dark, false)
      case 'donut':
        return buildPieOption(config, data, dark, true)
      case 'scatter':
      case 'bubble':
        return buildScatterOption(config, data, dark)
      case 'gauge':
        return buildGaugeOption(config, data)
      case 'funnel':
        return buildFunnelOption(config, data)
      case 'heatmap':
        return buildHeatmapOption(config, data)
      default:
        return {
          title: {
            text: `Chart type "${String(type)}" not supported`,
            left: 'center' as const,
            top: 'middle' as const,
            textStyle: { color: dark ? '#888' : '#999', fontSize: 14 },
          },
        }
    }
  }, [type, config, data, dark])

  return (
    <ReactECharts
      option={option}
      style={{ height, width: '100%' }}
      theme={dark ? 'dark' : undefined}
      notMerge
      lazyUpdate
    />
  )
}
