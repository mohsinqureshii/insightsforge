'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Users,
  Database,
  BarChart3,
  Activity,
  DollarSign,
  Shield,
  Search,
  Trash2,
  PauseCircle,
} from 'lucide-react'
import Link from 'next/link'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface PlatformStatsData {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  revenueMrr: number
  planBreakdown: {
    starter: number
    business: number
    enterprise: number
  }
  topTenantsByUsage: Array<{
    tenantId: string
    name: string
    queryCount: number
  }>
  tenants: Array<{
    id: string
    name: string
    slug: string
    plan: string
    status: string
    userCount: number
    queryCount: number
    createdAt: string
  }>
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700',
  business: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const ALL_PLANS = ['all', 'starter', 'business', 'enterprise'] as const
const ALL_STATUSES = ['all', 'active', 'trial', 'suspended', 'cancelled'] as const

export default function AdminOverviewPage() {
  const [data, setData] = useState<PlatformStatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/admin/platform-stats')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (err) {
      console.error('Failed to load platform stats', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSuspend = async (tenantId: string) => {
    if (!confirm('Suspend this tenant? They will lose access immediately.')) return
    await fetch(`/api/v1/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    })
    setData((prev) =>
      prev
        ? {
            ...prev,
            tenants: prev.tenants.map((t) =>
              t.id === tenantId ? { ...t, status: 'suspended' } : t,
            ),
          }
        : null,
    )
  }

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Permanently delete this tenant? This cannot be undone.')) return
    await fetch(`/api/v1/admin/tenants/${tenantId}`, { method: 'DELETE' })
    setData((prev) =>
      prev ? { ...prev, tenants: prev.tenants.filter((t) => t.id !== tenantId) } : null,
    )
  }

  const filteredTenants = (data?.tenants ?? []).filter((t) => {
    const matchesSearch =
      search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
    const matchesPlan = planFilter === 'all' || t.plan === planFilter
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesPlan && matchesStatus
  })

  const usageChartOption = {
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: (data?.topTenantsByUsage ?? []).map((t) =>
        t.name.length > 12 ? t.name.slice(0, 12) + '…' : t.name,
      ),
      axisLabel: { rotate: 30 },
    },
    yAxis: { type: 'value', name: 'Queries' },
    series: [
      {
        type: 'bar',
        data: (data?.topTenantsByUsage ?? []).map((t) => t.queryCount),
        itemStyle: { color: '#6366f1' },
      },
    ],
    grid: { bottom: 60 },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
          <p className="text-muted-foreground">Super admin control panel</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/usage">
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Usage Analytics
            </Button>
          </Link>
          <Link href="/admin/audit-log">
            <Button variant="outline" size="sm">
              <Shield className="mr-2 h-4 w-4" />
              Audit Log
            </Button>
          </Link>
          <Link href="/admin/tenants">
            <Button size="sm">
              <Users className="mr-2 h-4 w-4" />
              All Tenants
            </Button>
          </Link>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalTenants ?? 0}</div>
            <p className="text-xs text-muted-foreground">{data?.activeTenants ?? 0} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(data?.revenueMrr ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">estimated monthly</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan Breakdown</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                S: {data?.planBreakdown.starter ?? 0}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                B: {data?.planBreakdown.business ?? 0}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                E: {data?.planBreakdown.enterprise ?? 0}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">starter / business / enterprise</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart: Top 10 tenants by query count */}
      {(data?.topTenantsByUsage ?? []).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Tenants by Query Volume (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ReactECharts option={usageChartOption} style={{ height: 280 }} />
          </CardContent>
        </Card>
      )}

      {/* Tenant Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Tenants</CardTitle>
            <div className="flex flex-wrap gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 h-9 w-48"
                  placeholder="Search tenants…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Plan filter */}
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                {ALL_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p === 'all' ? 'All Plans' : p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>

              {/* Status filter */}
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Users</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Queries (30d)
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">{tenant.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_COLORS[tenant.plan] ?? ''}`}
                      >
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[tenant.status] ?? ''}`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{tenant.userCount}</td>
                    <td className="px-4 py-3 text-right">
                      {tenant.queryCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        {tenant.status !== 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 hover:text-amber-700"
                            onClick={() => handleSuspend(tenant.id)}
                          >
                            <PauseCircle className="h-3.5 w-3.5 mr-1" />
                            Suspend
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(tenant.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No tenants match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
