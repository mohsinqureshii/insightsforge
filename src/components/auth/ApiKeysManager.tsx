'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatRelativeTime } from '@/lib/utils'

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z
    .array(z.string())
    .min(1, 'Select at least one scope'),
  expiresAt: z.string().optional(),
})
type CreateKeyData = z.infer<typeof createKeySchema>

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
  user: { name: string | null; email: string }
}

interface ApiKeysManagerProps {
  apiKeys: ApiKey[]
  canCreate: boolean
  canRevoke: boolean
}

const ALL_SCOPES = [
  { value: 'reports:read', label: 'Reports - Read', group: 'Reports' },
  { value: 'reports:write', label: 'Reports - Write', group: 'Reports' },
  { value: 'dashboards:read', label: 'Dashboards - Read', group: 'Dashboards' },
  { value: 'dashboards:write', label: 'Dashboards - Write', group: 'Dashboards' },
  { value: 'data_sources:read', label: 'Data Sources - Read', group: 'Data' },
  { value: 'data_sources:write', label: 'Data Sources - Write', group: 'Data' },
  { value: 'queries:execute', label: 'Queries - Execute', group: 'Data' },
  { value: 'exports:download', label: 'Exports - Download', group: 'Data' },
  { value: 'users:read', label: 'Users - Read', group: 'Admin' },
  { value: 'users:write', label: 'Users - Write', group: 'Admin' },
]

export function ApiKeysManager({ apiKeys, canCreate, canRevoke }: ApiKeysManagerProps) {
  const router = useRouter()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [keyCopied, setKeyCopied] = useState(false)
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['reports:read'])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateKeyData>({
    resolver: zodResolver(createKeySchema),
  })

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  const onCreateKey = async (data: CreateKeyData) => {
    if (selectedScopes.length === 0) {
      toast.error('Please select at least one scope')
      return
    }
    setIsCreating(true)
    try {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, scopes: selectedScopes }),
      })
      const result = await response.json() as {
        success: boolean
        error?: string
        data?: { rawKey: string }
      }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to create API key')
        return
      }

      setCreatedKey(result.data?.rawKey ?? null)
      reset()
      setSelectedScopes(['reports:read'])
      setShowCreateForm(false)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsCreating(false)
    }
  }

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke API key "${keyName}"? This action cannot be undone.`)) return

    setIsRevoking(keyId)
    try {
      const response = await fetch(`/api/v1/api-keys?id=${keyId}`, { method: 'DELETE' })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to revoke key')
        return
      }

      toast.success('API key revoked')
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsRevoking(null)
    }
  }

  const copyKey = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* New key created banner */}
      {createdKey && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <AlertCircle className="h-4 w-4" />
            <p className="text-sm font-semibold">Save your API key now</p>
          </div>
          <p className="mb-3 text-xs text-amber-700 dark:text-amber-500">
            This key will not be shown again. Copy it to a safe location.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white px-3 py-2 font-mono text-xs dark:bg-slate-900">
              {createdKey}
            </code>
            <button
              onClick={copyKey}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-amber-500"
            >
              {keyCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {keyCopied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setCreatedKey(null)}
              className="rounded-lg border border-amber-300 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {canCreate && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Create API Key</CardTitle>
              <CardDescription className="mt-1">
                Generate a new key for programmatic access
              </CardDescription>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              New key
            </button>
          </CardHeader>

          {showCreateForm && (
            <CardContent>
              <form onSubmit={handleSubmit(onCreateKey)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Key name</label>
                  <input
                    {...register('name')}
                    type="text"
                    placeholder="e.g. Production Integration"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Permissions ({selectedScopes.length} selected)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SCOPES.map((scope) => (
                      <label
                        key={scope.value}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition hover:border-primary-300"
                      >
                        <input
                          type="checkbox"
                          checked={selectedScopes.includes(scope.value)}
                          onChange={() => toggleScope(scope.value)}
                          className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span>{scope.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Expiry date (optional)
                  </label>
                  <input
                    {...register('expiresAt')}
                    type="datetime-local"
                    className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create key
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {/* Keys list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Active Keys ({apiKeys.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <Key className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No API keys yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-start justify-between py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{key.name}</p>
                      {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                        <Badge variant="destructive" className="text-xs">Expired</Badge>
                      )}
                    </div>
                    <code className="text-xs text-muted-foreground">
                      {key.keyPrefix}••••••••••••••••
                    </code>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(key.createdAt)}
                      {key.lastUsedAt && ` · Last used ${formatRelativeTime(key.lastUsedAt)}`}
                      {key.expiresAt && ` · Expires ${formatDate(key.expiresAt)}`}
                    </p>
                  </div>

                  {canRevoke && (
                    <button
                      onClick={() => handleRevoke(key.id, key.name)}
                      disabled={isRevoking === key.id}
                      className="ml-4 flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      {isRevoking === key.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
