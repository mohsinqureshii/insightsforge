'use client'

import { useEffect, useRef } from 'react'
import type { AnomalyPoint } from '@/lib/ai/anomaly'

// ============================================================
// Types
// ============================================================

// ECharts instance type (minimal interface for what we use)
type EChartsInstance = {
  setOption: (option: Record<string, unknown>, merge?: boolean) => void
  getOption: () => Record<string, unknown>
}

type AnomalyMarkerProps = {
  anomalies: AnomalyPoint[]
  echartsRef: React.RefObject<EChartsInstance | null>
  /**
   * Which series index to attach mark points to (default: 0)
   */
  seriesIndex?: number
}

// ============================================================
// Component
// ============================================================

/**
 * AnomalyMarker overlays orange diamond (◆) markers on an ECharts line/area chart
 * at positions where anomalies were detected.
 *
 * It does NOT render any DOM of its own — it imperatively updates the provided
 * ECharts instance via setOption with markPoint data.
 */
export function AnomalyMarker({ anomalies, echartsRef, seriesIndex = 0 }: AnomalyMarkerProps) {
  const appliedRef = useRef<boolean>(false)

  useEffect(() => {
    const instance = echartsRef.current
    if (!instance) return
    if (anomalies.length === 0) return

    const anomalyPoints = anomalies
      .filter((a) => a.isAnomaly)
      .map((a) => ({
        name: 'Anomaly',
        coord: [a.timestamp, a.value],
        value: a.value,
        symbol: 'diamond',
        symbolSize: 12,
        itemStyle: {
          color: '#f97316', // orange-500
          borderColor: '#ea580c', // orange-600
          borderWidth: 1,
        },
        label: {
          show: false,
        },
        tooltip: {
          formatter: () =>
            `<strong>Anomaly Detected</strong><br/>` +
            `Value: <b>${a.value.toLocaleString()}</b><br/>` +
            `Z-Score: <b>${a.zScore.toFixed(2)}</b> std deviations from mean<br/>` +
            `Timestamp: ${a.timestamp}`,
        },
      }))

    if (anomalyPoints.length === 0) return

    // Merge markPoint into the target series without overwriting other options
    const currentOption = instance.getOption() as {
      series?: Array<Record<string, unknown>>
    }

    const seriesCount = currentOption.series?.length ?? 0
    if (seriesIndex >= seriesCount) return

    // Build a partial series update with markPoint
    const seriesUpdate = Array.from({ length: seriesCount }, (_, i) => {
      if (i !== seriesIndex) return {}
      return {
        markPoint: {
          symbol: 'diamond',
          symbolSize: 12,
          data: anomalyPoints,
          tooltip: {
            trigger: 'item',
            formatter: (params: { data: { tooltip?: { formatter?: () => string } } }) => {
              const formatter = params?.data?.tooltip?.formatter
              return typeof formatter === 'function' ? formatter() : 'Anomaly'
            },
          },
        },
      }
    })

    instance.setOption({ series: seriesUpdate }, true)
    appliedRef.current = true
  }, [anomalies, echartsRef, seriesIndex])

  // Clear markPoints when anomalies become empty
  useEffect(() => {
    if (anomalies.length === 0 && appliedRef.current) {
      const instance = echartsRef.current
      if (!instance) return

      const currentOption = instance.getOption() as {
        series?: Array<Record<string, unknown>>
      }
      const seriesCount = currentOption.series?.length ?? 0
      if (seriesIndex >= seriesCount) return

      const seriesUpdate = Array.from({ length: seriesCount }, (_, i) => {
        if (i !== seriesIndex) return {}
        return { markPoint: { data: [] } }
      })

      instance.setOption({ series: seriesUpdate }, true)
      appliedRef.current = false
    }
  }, [anomalies, echartsRef, seriesIndex])

  // This component renders nothing — it only updates the ECharts instance imperatively
  return null
}

export default AnomalyMarker
