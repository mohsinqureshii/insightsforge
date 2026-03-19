'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Download } from 'lucide-react'

interface AuditEntry {
  id: string
  tenantId: string | null
  tenantName: string | null
  userId: string | null
  userEmail: string | null
  action: string
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-700',
  login_failed: 'bg-red-100 text-red-700',
  plan_changed: 'bg-purple-100 text-purple-700',
  tenant_created: 'bg-blue-100 text-blue-700',
  user_invited: 'bg-teal-100 text-teal-700',
  user_removed: 'bg-orange-100 text-orange-700',
  report_deleted: 'bg-red-100 text-red-700',
  export_downloaded: 'bg-yellow-100 text-yellow-700',
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [tenantFilter, setTenantFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        platform: 'true',
        ...(search && { search }),
        ...(actionFilter && { action: actionFilter }),
        ...(tenantFilter && { tenantId: tenantFilter }),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
      })
      const res = await fetch(`/api/v1/audit-log?${params}`)
      const data = await res.json()
      if (data.success) {
        setEntries(data.data)
        setTotal(data.meta?.total ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [page, search, actionFilter, tenantFilter, dateFrom, dateTo])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleExport = async () => {
    const params = new URLSearchParams({
      format: 'csv',
      platform: 'true',
      ...(search && { search }),
      ...(actionFilter && { action: actionFilter }),
      ...(dateFrom && { from: dateFrom }),
      ...(dateTo && { to: dateTo }),
    })
    const res = await fetch(`/api/v1/audit-log?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `platform-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Audit Log</h1>
          <p className="text-muted-foreground">{total.toLocaleString()} events across all tenants</p>
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
                placeholder="Search user, action..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="login_failed">Login Failed</option>
              <option value="logout">Logout</option>
              <option value="plan_changed">Plan Changed</option>
              <option value="user_invited">User Invited</option>
              <option value="user_removed">User Removed</option>
              <option value="report_deleted">Report Deleted</option>
              <option value="export_downloaded">Export Downloaded</option>
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              className="w-40"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              className="w-40"
            />
          </div>
        </CardContent>
      </Card>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Resource</th>
                  <th className="text-left px-4 py-3 font-medium">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No audit entries found
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{entry.tenantName ?? 'Platform'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">{entry.userEmail ?? 'System'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-slate-100 text-slate-700'}`}
                        >
                          {entry.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {entry.entityType
                          ? `${entry.entityType}${entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {entry.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
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
