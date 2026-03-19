'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDashboardStore } from '@/stores/dashboard.store'

export function AutoRefresh() {
  const { autoRefreshSeconds, id } = useDashboardStore()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!autoRefreshSeconds || autoRefreshSeconds <= 0) return

    const intervalMs = autoRefreshSeconds * 1000

    const intervalId = setInterval(() => {
      // Invalidate all dashboard-related queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['dashboard', id] })
      queryClient.invalidateQueries({ queryKey: ['report-data'] })
      queryClient.invalidateQueries({ queryKey: ['kpi-data'] })
    }, intervalMs)

    return () => clearInterval(intervalId)
  }, [autoRefreshSeconds, id, queryClient])

  // Renders nothing visible – effect only
  return null
}
