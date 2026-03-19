'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, Plus, Trash2, Loader2, Eye, EyeOff, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

interface DataSource {
  id: string
  name: string
}

interface DataPolicy {
  id: string
  name: string
  description?: string | null
  policyType: 'row_filter' | 'column_mask' | 'column_deny'
  targetColumn?: string | null
  filterExpr?: string | null
  maskingStrategy?: string | null
  isActive: boolean
  dataSource: { id: string; name: string }
}

const POLICY_TYPE_LABELS = {
  row_filter: 'Row Filter',
  column_mask: 'Column Mask',
  column_deny: 'Column Deny',
} as const

const POLICY_TYPE_COLOURS = {
  row_filter: 'bg-blue-100 text-blue-800',
  column_mask: 'bg-amber-100 text-amber-800',
  column_deny: 'bg-red-100 text-red-800',
} as const

export default function GovernancePage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({
    dataSourceId: '',
    name: '',
    policyType: 'column_mask',
    targetColumn: '',
    filterExpr: '',
    maskingStrategy: 'redact',
    isActive: true,
  })

  const { data: sourcesData } = useQuery<{ data: DataSource[] }>({
    queryKey: ['data-sources-list'],
    queryFn: () => fetch('/api/v1/data-sources?limit=100').then((r) => r.json()),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['governance-policies'],
    queryFn: () =>
      fetch('/api/v1/governance/policies').then((r) => r.json()).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) =>
      fetch('/api/v1/governance/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ['governance-policies'] })
        setCreateOpen(false)
        toast.success('Policy created')
      } else {
        toast.error(res.error ?? 'Failed to create policy')
      }
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/v1/governance/policies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['governance-policies'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/v1/governance/policies/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] })
      toast.success('Policy deleted')
    },
  })

  const policies: DataPolicy[] = data ?? []
  const sources: DataSource[] = sourcesData?.data ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Governance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define row-level and column-level access policies to control data visibility.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Policy
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No policies yet</h3>
            <p className="text-sm text-gray-500 mt-1">
              Create a policy to control which data is visible based on roles.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Policy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {policies.map((policy) => (
            <Card key={policy.id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Shield className="h-5 w-5 mt-0.5 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900">{policy.name}</span>
                      <Badge className={POLICY_TYPE_COLOURS[policy.policyType]}>
                        {POLICY_TYPE_LABELS[policy.policyType]}
                      </Badge>
                      {!policy.isActive && (
                        <Badge className="bg-gray-100 text-gray-500">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Source: <span className="font-medium">{policy.dataSource.name}</span>
                      {policy.targetColumn && (
                        <> · Column: <span className="font-mono">{policy.targetColumn}</span></>
                      )}
                      {policy.maskingStrategy && (
                        <> · Mask: {policy.maskingStrategy}</>
                      )}
                      {policy.filterExpr && (
                        <> · Filter: <span className="font-mono">{policy.filterExpr}</span></>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={policy.isActive}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: policy.id, isActive: v })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(policy.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Data Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Data Source</Label>
              <Select
                value={form.dataSourceId}
                onValueChange={(v) => setForm((f) => ({ ...f, dataSourceId: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Select data source" /></SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mask customer emails"
              />
            </div>
            <div>
              <Label>Policy Type</Label>
              <Select
                value={form.policyType}
                onValueChange={(v) => setForm((f) => ({ ...f, policyType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="column_mask">Column Mask</SelectItem>
                  <SelectItem value="column_deny">Column Deny</SelectItem>
                  <SelectItem value="row_filter">Row Filter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.policyType !== 'row_filter' && (
              <div>
                <Label>Target Column</Label>
                <Input
                  value={form.targetColumn}
                  onChange={(e) => setForm((f) => ({ ...f, targetColumn: e.target.value }))}
                  placeholder="e.g. email"
                />
              </div>
            )}
            {form.policyType === 'column_mask' && (
              <div>
                <Label>Masking Strategy</Label>
                <Select
                  value={form.maskingStrategy}
                  onValueChange={(v) => setForm((f) => ({ ...f, maskingStrategy: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="redact">Redact ([REDACTED])</SelectItem>
                    <SelectItem value="partial">Partial (first N chars)</SelectItem>
                    <SelectItem value="hash">Hash (SHA-256)</SelectItem>
                    <SelectItem value="null_out">Null out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.policyType === 'row_filter' && (
              <div>
                <Label>Filter Expression</Label>
                <Input
                  value={form.filterExpr}
                  onChange={(e) => setForm((f) => ({ ...f, filterExpr: e.target.value }))}
                  placeholder='e.g. status = active'
                />
                <p className="text-xs text-gray-400 mt-1">
                  Syntax: {'<column> <op> <value>'}. Ops: = != {'>'} {'<'} {'>='} {'<='} contains starts_with
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || !form.dataSourceId || createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
