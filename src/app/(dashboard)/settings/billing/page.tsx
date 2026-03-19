'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, CreditCard, Download, AlertTriangle } from 'lucide-react'

interface UsageMeter {
  label: string
  used: number
  limit: number
  unit: string
}

interface Invoice {
  id: string
  number: string
  amount: number
  currency: string
  status: string
  period: string
  pdfUrl: string | null
  createdAt: string
}

interface BillingInfo {
  plan: string
  status: string
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  usage: UsageMeter[]
  invoices: Invoice[]
  cardBrand: string | null
  cardLast4: string | null
}

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    features: ['5 users', '3 data sources', '20 reports', 'Email support'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    features: ['25 users', '10 data sources', 'Unlimited reports', 'Priority support', 'SSO', 'API access'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    features: ['Unlimited users', 'Unlimited sources', 'Unlimited reports', 'Dedicated support', 'Custom SLA', 'On-premise option'],
  },
]

export default function BillingPage() {
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)

  useEffect(() => {
    fetch('/api/v1/billing/info')
      .then((r) => r.json())
      .then((d) => { if (d.success) setBilling(d.data) })
      .finally(() => setLoading(false))
  }, [])

  const handleUpgrade = async (planId: string) => {
    setUpgrading(true)
    try {
      const res = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (data.success && data.data?.url) {
        window.location.href = data.data.url
      }
    } finally {
      setUpgrading(false)
    }
  }

  const handleManage = async () => {
    const res = await fetch('/api/v1/billing/portal', { method: 'POST' })
    const data = await res.json()
    if (data.success && data.data?.url) window.location.href = data.data.url
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and billing details</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold capitalize">{billing?.plan ?? 'starter'}</span>
                <Badge
                  variant={billing?.status === 'active' ? 'default' : 'destructive'}
                  className="capitalize"
                >
                  {billing?.status ?? 'active'}
                </Badge>
              </div>
              {billing?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {billing.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(billing.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
              {billing?.cardLast4 && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {billing.cardBrand?.toUpperCase()} ending in {billing.cardLast4}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={handleManage}>
              Manage Billing
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Meters */}
      {billing?.usage && billing.usage.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage This Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {billing.usage.map((meter) => {
              const pct = meter.limit > 0 ? Math.min((meter.used / meter.limit) * 100, 100) : 0
              return (
                <div key={meter.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{meter.label}</span>
                    <span className="text-muted-foreground">
                      {meter.used.toLocaleString()} / {meter.limit.toLocaleString()} {meter.unit}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-primary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {pct >= 90 && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Approaching limit
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Plan Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Available Plans</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = billing?.plan === plan.id
            return (
              <Card
                key={plan.id}
                className={isCurrent ? 'border-primary ring-1 ring-primary' : ''}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {isCurrent && <Badge>Current</Badge>}
                  </div>
                  <CardDescription>
                    {plan.price !== null ? (
                      <span className="text-2xl font-bold text-foreground">
                        ${plan.price}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </span>
                    ) : (
                      <span className="text-2xl font-bold text-foreground">Custom</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button
                      className="w-full"
                      variant={plan.price === null ? 'outline' : 'default'}
                      onClick={() => plan.price !== null ? handleUpgrade(plan.id) : window.location.href = 'mailto:sales@insightsforge.com'}
                      disabled={upgrading}
                    >
                      {plan.price !== null
                        ? billing?.plan === 'starter' && plan.id === 'business'
                          ? 'Upgrade'
                          : billing?.plan === 'enterprise'
                          ? 'Downgrade'
                          : 'Switch'
                        : 'Contact Sales'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Billing History */}
      {billing?.invoices && billing.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium">Period</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Download</th>
                </tr>
              </thead>
              <tbody>
                {billing.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.period}</td>
                    <td className="px-4 py-3 font-medium">
                      {(inv.amount / 100).toLocaleString('en-US', {
                        style: 'currency',
                        currency: inv.currency.toUpperCase(),
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`capitalize text-xs font-medium px-2 py-0.5 rounded-full ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
