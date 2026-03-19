'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

type DailyQueryPoint = {
  date: string
  tenantName: string
  tenantId: string
  count: number
}

interface UsageChartClientProps {
  dailyPoints: DailyQueryPoint[]
}

export function UsageChartClient({ dailyPoints }: UsageChartClientProps) {
  const option = useMemo(() => {
    // Build unique dates and tenants
    const dateSet = new Set<string>()
    const tenantSet = new Set<string>()
    for (const p of dailyPoints) {
      dateSet.add(p.date)
      tenantSet.add(p.tenantName)
    }

    const dates = Array.from(dateSet).sort()
    const tenants = Array.from(tenantSet)

    // Build lookup map: tenantName -> date -> count
    const lookup = new Map<string, Map<string, number>>()
    for (const p of dailyPoints) {
      if (!lookup.has(p.tenantName)) lookup.set(p.tenantName, new Map())
      lookup.get(p.tenantName)!.set(p.date, p.count)
    }

    const series = tenants.map((tenant) => ({
      name: tenant,
      type: 'bar',
      stack: 'queries',
      data: dates.map((d) => lookup.get(tenant)?.get(d) ?? 0),
      emphasis: { focus: 'series' },
    }))

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, type: 'scroll' },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: 'Queries' },
      series,
      grid: { bottom: 80 },
    }
  }, [dailyPoints])

  if (dailyPoints.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No query data for the last 30 days
      </div>
    )
  }

  return <ReactECharts option={option} style={{ height: 320 }} />
}
