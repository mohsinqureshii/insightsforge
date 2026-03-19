'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  Eye,
  Clock,
  Star,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'
import type { Dashboard } from '@/types/insightsforge'

interface DashboardListItem extends Dashboard {
  _count?: { widgets: number }
  createdByUser?: { name: string | null; email: string }
}

async function fetchDashboards(q: string): Promise<DashboardListItem[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  const res = await fetch(`/api/v1/dashboards?${params}`)
  if (!res.ok) throw new Error('Failed to fetch dashboards')
  const json = await res.json()
  return json.data ?? []
}

async function duplicateDashboard(id: string): Promise<DashboardListItem> {
  const res = await fetch(`/api/v1/dashboards/${id}/duplicate`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to duplicate dashboard')
  const json = await res.json()
  return json.data
}

async function deleteDashboard(id: string): Promise<void> {
  const res = await fetch(`/api/v1/dashboards/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete dashboard')
}

export default function DashboardsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ['dashboards', debouncedSearch],
    queryFn: () => fetchDashboards(debouncedSearch),
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateDashboard,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      toast.success('Dashboard duplicated')
      router.push(`/dashboards/${data.id}`)
    },
    onError: () => toast.error('Failed to duplicate dashboard'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      toast.success('Dashboard deleted')
    },
    onError: () => toast.error('Failed to delete dashboard'),
  })

  const handleSearch = (value: string) => {
    setSearch(value)
    clearTimeout((window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer)
    ;(window as Window & { _searchTimer?: ReturnType<typeof setTimeout> })._searchTimer = setTimeout(
      () => setDebouncedSearch(value),
      300,
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboards</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build, share and monitor your analytics dashboards
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboards/new">
            <Plus className="h-4 w-4 mr-2" />
            New Dashboard
          </Link>
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search dashboards..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none border-0"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-2'
          }
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No dashboards yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create your first dashboard to start visualizing data
          </p>
          <Button asChild>
            <Link href="/dashboards/new">
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Link>
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onDuplicate={() => duplicateMutation.mutate(dashboard.id)}
              onDelete={() => {
                if (confirm(`Delete "${dashboard.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(dashboard.id)
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border divide-y overflow-hidden">
          {dashboards.map((dashboard) => (
            <DashboardListRow
              key={dashboard.id}
              dashboard={dashboard}
              onDuplicate={() => duplicateMutation.mutate(dashboard.id)}
              onDelete={() => {
                if (confirm(`Delete "${dashboard.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(dashboard.id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DashboardCard({
  dashboard,
  onDuplicate,
  onDelete,
}: {
  dashboard: DashboardListItem
  onDuplicate: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  return (
    <Card
      className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
      onClick={() => router.push(`/dashboards/${dashboard.id}`)}
    >
      <CardContent className="p-0">
        {/* Preview area */}
        <div className="h-28 bg-gradient-to-br from-primary/5 to-primary/10 rounded-t-xl flex items-center justify-center border-b">
          <LayoutDashboard className="h-10 w-10 text-primary/30" />
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate text-sm">{dashboard.name}</h3>
              {dashboard.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {dashboard.description}
                </p>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboards/${dashboard.id}`)
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    router.push(`/dashboards/${dashboard.id}?edit=true`)
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate()
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(dashboard.updatedAt)}
            </div>
            {dashboard._count?.widgets !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <LayoutDashboard className="h-3 w-3" />
                {dashboard._count.widgets} widgets
              </div>
            )}
            {dashboard.isFeatured && (
              <Badge variant="secondary" className="text-xs h-4 px-1.5">
                <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                Featured
              </Badge>
            )}
            <Badge
              variant={dashboard.visibility === 'private' ? 'outline' : 'secondary'}
              className="text-xs h-4 px-1.5 ml-auto"
            >
              {dashboard.visibility}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardListRow({
  dashboard,
  onDuplicate,
  onDelete,
}: {
  dashboard: DashboardListItem
  onDuplicate: () => void
  onDelete: () => void
}) {
  const router = useRouter()
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => router.push(`/dashboards/${dashboard.id}`)}
    >
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <LayoutDashboard className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{dashboard.name}</span>
          {dashboard.isFeatured && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-current shrink-0" />
          )}
        </div>
        {dashboard.description && (
          <p className="text-xs text-muted-foreground truncate">{dashboard.description}</p>
        )}
      </div>
      <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
        {dashboard._count?.widgets !== undefined && (
          <span>{dashboard._count.widgets} widgets</span>
        )}
        <Badge variant="outline" className="text-xs">
          {dashboard.visibility}
        </Badge>
        <span>{formatRelativeTime(dashboard.updatedAt)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                router.push(`/dashboards/${dashboard.id}?edit=true`)
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation()
                onDuplicate()
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
