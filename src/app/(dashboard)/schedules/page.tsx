'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar,
  Plus,
  Clock,
  Mail,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  MoreVertical,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { formatRelativeTime } from '@/lib/utils'
import type { Schedule, DeliveryChannel, ScheduleFrequency } from '@/types/insightsforge'

interface ScheduleListItem extends Schedule {
  report?: { id: string; name: string } | null
  dashboard?: { id: string; name: string } | null
  lastDelivery?: {
    status: string
    completedAt: Date | null
  } | null
}

async function fetchSchedules(): Promise<ScheduleListItem[]> {
  const res = await fetch('/api/v1/schedules')
  if (!res.ok) throw new Error('Failed to load schedules')
  const json = await res.json()
  return json.data ?? []
}

async function toggleSchedule(id: string, isActive: boolean): Promise<void> {
  const res = await fetch(`/api/v1/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive }),
  })
  if (!res.ok) throw new Error('Failed to update schedule')
}

async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`/api/v1/schedules/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete schedule')
}

const FREQUENCY_LABELS: Record<ScheduleFrequency, string> = {
  hourly: 'Every hour',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  cron: 'Custom',
}

const CHANNEL_ICONS: Record<DeliveryChannel, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  slack: <Globe className="h-3.5 w-3.5" />,
  webhook: <Globe className="h-3.5 w-3.5" />,
  s3: <Globe className="h-3.5 w-3.5" />,
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  )
}

function DeliveryStatusBadge({ status }: { status?: string }) {
  if (!status) return null
  switch (status) {
    case 'success':
      return (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 className="h-3 w-3" />
          <span>Delivered</span>
        </div>
      )
    case 'failed':
      return (
        <div className="flex items-center gap-1 text-xs text-destructive">
          <XCircle className="h-3 w-3" />
          <span>Failed</span>
        </div>
      )
    case 'running':
      return (
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Running</span>
        </div>
      )
    default:
      return (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <AlertCircle className="h-3 w-3" />
          <span className="capitalize">{status}</span>
        </div>
      )
  }
}

function ScheduleRow({
  schedule,
  onToggle,
  onDelete,
}: {
  schedule: ScheduleListItem
  onToggle: (isActive: boolean) => void
  onDelete: () => void
}) {
  const recipientCount = schedule.recipients?.length ?? 0
  const targetName = schedule.report?.name ?? schedule.dashboard?.name ?? 'Unknown'

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Toggle */}
      <Switch
        checked={schedule.isActive}
        onCheckedChange={onToggle}
        aria-label="Toggle schedule"
      />

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{schedule.name}</span>
          {!schedule.isActive && (
            <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
              Paused
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="truncate">Report: {targetName}</span>
          <span className="flex items-center gap-1">
            {CHANNEL_ICONS[schedule.channel]}
            {recipientCount} recipient{recipientCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {FREQUENCY_LABELS[schedule.frequency] ?? schedule.frequency}
          </span>
        </div>
      </div>

      {/* Next run */}
      <div className="hidden sm:block shrink-0 text-xs text-muted-foreground text-right">
        {schedule.nextRunAt ? (
          <div>
            <p className="text-foreground font-medium">
              {new Date(schedule.nextRunAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <p className="text-muted-foreground">Next run</p>
          </div>
        ) : (
          <p className="italic">No next run</p>
        )}
      </div>

      {/* Last delivery */}
      <div className="hidden md:block shrink-0 text-right">
        <DeliveryStatusBadge status={schedule.lastDelivery?.status} />
        {schedule.lastRunAt && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatRelativeTime(schedule.lastRunAt)}
          </p>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onToggle(!schedule.isActive)}>
            {schedule.isActive ? (
              <>
                <ToggleLeft className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <ToggleRight className="mr-2 h-4 w-4" />
                Enable
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default function SchedulesPage() {
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['schedules'],
    queryFn: fetchSchedules,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleSchedule(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Schedule updated')
    },
    onError: () => toast.error('Failed to update schedule'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Schedule deleted')
    },
    onError: () => toast.error('Failed to delete schedule'),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedules</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Automate report delivery via email, Slack or webhooks
          </p>
        </div>
        <Button onClick={() => setShowNewForm((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {/* New schedule inline form placeholder */}
      {showNewForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Schedule creation form coming soon. Use the API to create schedules in the meantime.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowNewForm(false)}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <ScheduleSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <XCircle className="mb-3 h-8 w-8 text-destructive" />
          <p className="text-sm font-medium">Failed to load schedules</p>
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No schedules yet</h3>
          <p className="mb-6 mt-1 text-sm text-muted-foreground">
            Set up automated delivery of reports to your team
          </p>
          <Button onClick={() => setShowNewForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <ScheduleRow
              key={schedule.id}
              schedule={schedule}
              onToggle={(isActive) =>
                toggleMutation.mutate({ id: schedule.id, isActive })
              }
              onDelete={() => {
                if (confirm(`Delete schedule "${schedule.name}"? This cannot be undone.`)) {
                  deleteMutation.mutate(schedule.id)
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
