'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  FileText,
  BarChart3,
  Database,
  Calendar,
  CreditCard,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'

interface TenantDetail {
  id: string
  name: string
  slug: string
  plan: string
  status: string
  domain: string | null
  logoUrl: string | null
  maxUsers: number
  maxSources: number
  maxReports: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
  userCount: number
  reportCount: number
  dashboardCount: number
  dataSourceCount: number
  activeUsers30d: number
  queriesThisMonth: number
  users: Array<{
    id: string
    name: string | null
    email: string
    role: string
    lastLoginAt: string | null
  }>
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    async function fetchTenant() {
      try {
        const res = await fetch(`/api/v1/admin/tenants/${id}`)
        const data = await res.json()
        if (data.success) setTenant(data.data)
      } finally {
        setLoading(false)
      }
    }
    fetchTenant()
  }, [id])

  const handleAction = async (action: 'suspend' | 'reactivate' | 'cancel') => {
    const statusMap = { suspend: 'suspended', reactivate: 'active', cancel: 'cancelled' }
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this tenant?`)) return
    setActionLoading(true)
    try {
      await fetch(`/api/v1/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusMap[action] }),
      })
      setTenant((prev) => prev ? { ...prev, status: statusMap[action] } : prev)
    } finally {
      setActionLoading(false)
    }
  }

  const handleImpersonate = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/v1/admin/tenants/${id}/impersonate`, { method: 'POST' })
      const data = await res.json()
      if (data.success && data.data?.url) window.open(data.data.url, '_blank')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tenant not found</p>
        <Link href="/admin/tenants">
          <Button className="mt-4" variant="outline">Back to Tenants</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
          <p className="text-muted-foreground">{tenant.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleImpersonate} disabled={actionLoading}>
            Impersonate
          </Button>
          {(tenant.status === 'active' || tenant.status === 'trial') && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600"
              onClick={() => handleAction('suspend')}
              disabled={actionLoading}
            >
              Suspend
            </Button>
          )}
          {tenant.status === 'suspended' && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600"
              onClick={() => handleAction('reactivate')}
              disabled={actionLoading}
            >
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Status Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant={tenant.plan === 'enterprise' ? 'outline' : 'secondary'} className="capitalize">
          {tenant.plan} plan
        </Badge>
        <span
          className={`capitalize text-xs font-medium px-2.5 py-1 rounded-full ${
            tenant.status === 'active' ? 'bg-green-100 text-green-700' :
            tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
            tenant.status === 'suspended' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-700'
          }`}
        >
          {tenant.status}
        </span>
        {tenant.trialEndsAt && (
          <span className="text-sm text-muted-foreground">
            Trial ends {new Date(tenant.trialEndsAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Users', value: tenant.userCount, max: tenant.maxUsers, icon: Users },
          { label: 'Reports', value: tenant.reportCount, max: tenant.maxReports, icon: FileText },
          { label: 'Dashboards', value: tenant.dashboardCount, max: null, icon: BarChart3 },
          { label: 'Data Sources', value: tenant.dataSourceCount, max: tenant.maxSources, icon: Database },
        ].map(({ label, value, max, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              {max && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{value} used</span>
                    <span>{max} limit</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stripe Customer</span>
              <span className="font-mono text-xs">{tenant.stripeCustomerId ?? 'Not linked'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subscription</span>
              <span className="font-mono text-xs">{tenant.stripeSubscriptionId ?? 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Active Users (30d)</span>
              <span className="font-bold">{tenant.activeUsers30d}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Queries This Month</span>
              <span className="font-bold">{tenant.queriesThisMonth.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Custom Domain</span>
              <span>{tenant.domain ?? 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>{new Date(tenant.updatedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users ({tenant.users.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Email</th>
                <th className="text-left px-4 py-2 font-medium">Role</th>
                <th className="text-left px-4 py-2 font-medium">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {tenant.users.map((user) => (
                <tr key={user.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{user.name ?? 'Unnamed'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-2 capitalize">{user.role.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
