'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  Database,
  BarChart3,
  Activity,
  FileText,
  Download,
  TrendingUp,
  Shield,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

interface PlatformStats {
  totalTenants: number
  activeTenants: number
  totalUsers: number
  totalReports: number
  totalDashboards: number
  queriesToday: number
  exportsToday: number
  activeUsersToday: number
}

interface TenantRow {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  userCount: number
  reportCount: number
  lastActiveAt: string | null
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

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, tenantsRes] = await Promise.all([
          fetch('/api/v1/admin/usage'),
          fetch('/api/v1/admin/tenants?limit=10&sort=lastActiveAt'),
        ])
        const statsData = await statsRes.json()
        const tenantsData = await tenantsRes.json()
        if (statsData.success) setStats(statsData.data)
        if (tenantsData.success) setTenants(tenantsData.data)
      } catch (err) {
        console.error('Failed to load admin data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSuspend = async (tenantId: string) => {
    if (!confirm('Suspend this tenant? They will lose access immediately.')) return
    await fetch(`/api/v1/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'suspended' }),
    })
    setTenants((prev) =>
      prev.map((t) => (t.id === tenantId ? { ...t, status: 'suspended' } : t)),
    )
  }

  const handleImpersonate = async (tenantId: string) => {
    const res = await fetch(`/api/v1/admin/tenants/${tenantId}/impersonate`, {
      method: 'POST',
    })
    const data = await res.json()
    if (data.success && data.data?.url) {
      window.open(data.data.url, '_blank')
    }
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
            <div className="text-2xl font-bold">{stats?.totalTenants ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeTenants ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsersToday ?? 0} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.queriesToday ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exports Today</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.exportsToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">CSV / PDF / XLSX</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalReports ?? 0}</div>
            <p className="text-xs text-muted-foreground">across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dashboards</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDashboards ?? 0}</div>
            <p className="text-xs text-muted-foreground">across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No active incidents</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recently Active Tenants</CardTitle>
            <Link href="/admin/tenants">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-muted-foreground">Tenant</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Users</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Reports</th>
                  <th className="text-left py-2 font-medium text-muted-foreground">Last Active</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="py-3">
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">{tenant.slug}</div>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_COLORS[tenant.plan] ?? ''}`}
                      >
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[tenant.status] ?? ''}`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">{tenant.userCount}</td>
                    <td className="py-3 text-right">{tenant.reportCount}</td>
                    <td className="py-3 text-muted-foreground">
                      {tenant.lastActiveAt
                        ? new Date(tenant.lastActiveAt).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleImpersonate(tenant.id)}
                        >
                          Impersonate
                        </Button>
                        {tenant.status !== 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleSuspend(tenant.id)}
                          >
                            Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {tenants.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No tenants found
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
