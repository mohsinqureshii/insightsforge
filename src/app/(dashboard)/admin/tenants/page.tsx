'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Download } from 'lucide-react'
import Link from 'next/link'

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  userCount: number
  reportCount: number
  dashboardCount: number
  createdAt: string
  lastActiveAt: string | null
  stripeCustomerId: string | null
}

const PLAN_BADGE: Record<string, string> = {
  starter: 'secondary',
  business: 'default',
  enterprise: 'outline',
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 20

  const fetchTenants = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter && { status: statusFilter }),
      })
      const res = await fetch(`/api/v1/admin/tenants?${params}`)
      const data = await res.json()
      if (data.success) {
        setTenants(data.data)
        setTotal(data.meta?.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, planFilter, statusFilter])

  useEffect(() => {
    fetchTenants()
  }, [fetchTenants])

  const handleExport = async () => {
    const res = await fetch('/api/v1/admin/tenants?format=csv')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tenants-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleStatusChange = async (tenantId: string, status: string) => {
    await fetch(`/api/v1/admin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchTenants()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-muted-foreground">{total} total tenants</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
            >
              <option value="">All Plans</option>
              <option value="starter">Starter</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Users</th>
                  <th className="text-right px-4 py-3 font-medium">Reports</th>
                  <th className="text-right px-4 py-3 font-medium">Dashboards</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Last Active</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      No tenants found
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-xs text-muted-foreground">{tenant.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={(PLAN_BADGE[tenant.plan] ?? 'secondary') as 'default' | 'secondary' | 'outline'}>
                          {tenant.plan}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`capitalize text-xs font-medium px-2 py-1 rounded-full ${
                            tenant.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : tenant.status === 'trial'
                              ? 'bg-yellow-100 text-yellow-700'
                              : tenant.status === 'suspended'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {tenant.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">{tenant.userCount}</td>
                      <td className="px-4 py-3 text-right">{tenant.reportCount}</td>
                      <td className="px-4 py-3 text-right">{tenant.dashboardCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(tenant.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {tenant.lastActiveAt
                          ? new Date(tenant.lastActiveAt).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          {tenant.status === 'active' || tenant.status === 'trial' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => handleStatusChange(tenant.id, 'suspended')}
                            >
                              Suspend
                            </Button>
                          ) : tenant.status === 'suspended' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => handleStatusChange(tenant.id, 'active')}
                            >
                              Reactivate
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
