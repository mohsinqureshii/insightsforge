'use client'

import Link from 'next/link'
import { BarChart3, LayoutDashboard, Database, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap } from 'lucide-react'

const quickActions = [
  {
    label: 'New Report',
    href: '/reports/new',
    icon: BarChart3,
    desc: 'Build a new chart or table',
  },
  {
    label: 'New Dashboard',
    href: '/dashboards/new',
    icon: LayoutDashboard,
    desc: 'Combine reports into a dashboard',
  },
  {
    label: 'Add Data Source',
    href: '/data-sources/new',
    icon: Database,
    desc: 'Connect a new data source',
  },
  {
    label: 'Invite User',
    href: '/settings/team',
    icon: Users,
    desc: 'Add members to your workspace',
  },
]

export function DashboardQuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          Quick Actions
        </CardTitle>
        <CardDescription>Jump into common tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-start gap-3 rounded-lg border p-3 text-sm transition hover:border-primary-300 hover:bg-primary-50 dark:hover:border-primary-800 dark:hover:bg-primary-950/30"
            >
              <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary-600" />
              <div>
                <p className="font-medium">{action.label}</p>
                <p className="text-xs text-muted-foreground">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
