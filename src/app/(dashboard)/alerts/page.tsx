'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Edit2,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface AlertRule {
  id: string
  name: string
  description?: string | null
  metricField: string
  condition: string
  threshold: number
  severity: 'info' | 'warning' | 'critical'
  state: 'ok' | 'firing' | 'silenced'
  isActive: boolean
  lastFiredAt?: string | null
  _count: { firings: number }
  report?: { id: string; name: string } | null
}

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertCircle,
} as const

const SEVERITY_COLOURS = {
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-yellow-100 text-yellow-800',
  critical: 'bg-red-100 text-red-800',
} as const

const STATE_COLOURS = {
  ok: 'bg-green-100 text-green-800',
  firing: 'bg-red-100 text-red-800',
  silenced: 'bg-gray-100 text-gray-700',
} as const

export default function AlertsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    metricField: '',
    condition: 'greater_than',
    threshold: 0,
    severity: 'warning',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () =>
      fetch('/api/v1/alert-rules').then((r) => r.json()).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      fetch('/api/v1/alert-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
        setCreateOpen(false)
        setForm({ name: '', metricField: '', condition: 'greater_than', threshold: 0, severity: 'warning' })
        toast.success('Alert rule created')
      } else {
        toast.error(res.error ?? 'Failed to create rule')
      }
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/v1/alert-rules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/alert-rules/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] })
      toast.success('Alert rule deleted')
    },
  })

  const rules: AlertRule[] = data?.rules ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Rules</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor metrics and get notified when thresholds are exceeded</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Alert Rule
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No alert rules yet</h3>
            <p className="text-sm text-gray-500 mt-1">Create your first rule to start monitoring your metrics.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Alert Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => {
            const SeverityIcon = SEVERITY_ICONS[rule.severity]
            return (
              <Card key={rule.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <SeverityIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{rule.name}</span>
                          <Badge className={SEVERITY_COLOURS[rule.severity]}>{rule.severity}</Badge>
                          <Badge className={STATE_COLOURS[rule.state]}>{rule.state}</Badge>
                          {!rule.isActive && <Badge className="bg-gray-100 text-gray-500">Disabled</Badge>}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          <span className="font-mono">{rule.metricField}</span>{' '}
                          {rule.condition.replace(/_/g, ' ')} <strong>{rule.threshold}</strong>
                        </p>
                        {rule.report && (
                          <p className="text-xs text-gray-400 mt-0.5">Report: {rule.report.name}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          Fired {rule._count.firings} time{rule._count.firings !== 1 ? 's' : ''}
                          {rule.lastFiredAt && ` · Last: ${new Date(rule.lastFiredAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(v) => toggleMutation.mutate({ id: rule.id, isActive: v })}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteMutation.mutate(rule.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Alert Rule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. High error rate"
              />
            </div>
            <div>
              <Label>Metric Field</Label>
              <Input
                value={form.metricField}
                onChange={(e) => setForm((f) => ({ ...f, metricField: e.target.value }))}
                placeholder="e.g. error_rate"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condition</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) => setForm((f) => ({ ...f, condition: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="greater_than">Greater than</SelectItem>
                    <SelectItem value="less_than">Less than</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="percentage_change_up">% Change up</SelectItem>
                    <SelectItem value="percentage_change_down">% Change down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Threshold</Label>
                <Input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm((f) => ({ ...f, threshold: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div>
              <Label>Severity</Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((f) => ({ ...f, severity: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.metricField || createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
