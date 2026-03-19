'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Circle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

const STEP_LABELS: Record<string, { label: string; description: string; href: string }> = {
  connect_data_source: {
    label: 'Connect a data source',
    description: 'Link a database, CSV file, or REST API to start querying data.',
    href: '/data-sources/new',
  },
  create_first_report: {
    label: 'Create your first report',
    description: 'Build a table or chart from your connected data.',
    href: '/reports/new',
  },
  create_first_dashboard: {
    label: 'Build a dashboard',
    description: 'Combine multiple reports into a single view.',
    href: '/dashboards/new',
  },
  invite_team: {
    label: 'Invite a team member',
    description: 'Collaborate with colleagues by inviting them to your workspace.',
    href: '/settings/team',
  },
  schedule_report: {
    label: 'Schedule a report',
    description: 'Automatically deliver reports via email on a recurring schedule.',
    href: '/schedules',
  },
  share_content: {
    label: 'Share a report or dashboard',
    description: 'Create a public or password-protected shareable link.',
    href: '/reports',
  },
}

export function OnboardingChecklist() {
  const queryClient = useQueryClient()
  const [collapsed, setCollapsed] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding'],
    queryFn: () => fetch('/api/v1/onboarding').then((r) => r.json()).then((r) => r.data),
  })

  const dismissMutation = useMutation({
    mutationFn: () =>
      fetch('/api/v1/onboarding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismiss: true }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['onboarding'] }),
  })

  if (isLoading || !data || data.dismissed || data.completedAt) return null

  const steps = data.steps as Record<string, boolean>

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Getting started</CardTitle>
            <span className="text-sm text-gray-500">
              {data.completedCount}/{data.totalSteps} steps complete
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-gray-400"
              onClick={() => dismissMutation.mutate()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Progress value={data.percentComplete} className="h-1.5 mt-2" />
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {Object.entries(STEP_LABELS).map(([key, step]) => {
              const done = steps[key] ?? false
              return (
                <Link
                  key={key}
                  href={done ? '#' : step.href}
                  className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${
                    done ? 'opacity-50 cursor-default' : 'hover:bg-blue-50 cursor-pointer'
                  }`}
                  onClick={(e) => done && e.preventDefault()}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
