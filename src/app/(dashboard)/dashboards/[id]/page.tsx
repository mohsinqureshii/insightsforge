'use client'

import { useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useDashboardStore } from '@/stores/dashboard.store'
import { DashboardCanvas } from '@/components/dashboard/DashboardCanvas'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardFilterBar } from '@/components/dashboard/DashboardFilterBar'
import { AutoRefresh } from '@/components/dashboard/AutoRefresh'
import { FullscreenMode } from '@/components/dashboard/FullscreenMode'
import { Skeleton } from '@/components/ui/skeleton'
import type { WidgetConfig } from '@/stores/dashboard.store'

interface DashboardData {
  id: string
  name: string
  description: string | null
  config: {
    refreshInterval?: number
    globalFilters?: Record<string, unknown>
  }
  widgets: Array<{
    id: string
    type: WidgetConfig['type']
    reportId?: string | null
    title?: string | null
    titleOverride?: string | null
    displayConfig: Record<string, unknown>
    gridPos: { x: number; y: number; w: number; h: number }
  }>
  visibility: string
  createdBy: string
  updatedAt: string
}

async function fetchDashboard(id: string): Promise<DashboardData> {
  const res = await fetch(`/api/v1/dashboards/${id}`)
  if (!res.ok) throw new Error('Failed to fetch dashboard')
  const json = await res.json()
  return json.data
}

export default function DashboardViewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const shouldEdit = searchParams.get('edit') === 'true'

  const { loadDashboard, setEditMode, isFullscreen } = useDashboardStore()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: () => fetchDashboard(id),
    enabled: !!id,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (data) {
      loadDashboard({
        id: data.id,
        name: data.name,
        description: data.description ?? '',
        widgets: data.widgets.map((w) => ({
          id: w.id,
          type: w.type,
          reportId: w.reportId ?? undefined,
          title: w.title ?? undefined,
          titleOverride: w.titleOverride ?? undefined,
          displayConfig: w.displayConfig,
          gridPos: w.gridPos,
        })),
        autoRefreshSeconds: data.config?.refreshInterval ?? null,
        dashboardFilters: data.config?.globalFilters ?? {},
      })
    }
  }, [data, loadDashboard])

  useEffect(() => {
    if (shouldEdit) {
      setEditMode(true)
    }
  }, [shouldEdit, setEditMode])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center">
        <p className="text-lg font-semibold text-destructive">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">
          The dashboard may have been deleted or you don&apos;t have access.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const content = (
    <div className="flex flex-col h-full -m-6">
      <DashboardHeader dashboardId={id} />
      <DashboardFilterBar />
      <AutoRefresh />
      <div className="flex-1 overflow-auto p-4">
        <DashboardCanvas />
      </div>
    </div>
  )

  if (isFullscreen) {
    return <FullscreenMode>{content}</FullscreenMode>
  }

  return content
}
