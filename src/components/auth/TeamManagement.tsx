'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MoreVertical, Plus, ShieldCheck, UserMinus, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/rbac'
import type { Role, InviteStatus } from '@/types/insightsforge'

interface Member {
  id: string
  tenantId: string
  userId: string
  role: Role
  inviteStatus: InviteStatus
  joinedAt: Date | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    lastLoginAt: Date | null
    mfaEnabled: boolean
  }
}

interface TeamManagementProps {
  members: Member[]
  currentUserId: string
  currentRole: Role
  canManage: boolean
  tenantId: string
}

const inviteSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.enum(['analytics_admin', 'builder', 'viewer', 'api_user']),
})
type InviteData = z.infer<typeof inviteSchema>

const ROLE_VARIANT: Record<Role, 'default' | 'info' | 'success' | 'warning' | 'outline'> = {
  super_admin: 'warning',
  tenant_admin: 'info',
  analytics_admin: 'success',
  builder: 'default',
  viewer: 'outline',
  api_user: 'outline',
}

export function TeamManagement({
  members,
  currentUserId,
  currentRole,
  canManage,
  tenantId,
}: TeamManagementProps) {
  const router = useRouter()
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'viewer' },
  })

  const onInvite = async (data: InviteData) => {
    setIsInviting(true)
    try {
      const response = await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to send invite')
        return
      }

      toast.success(`Invite sent to ${data.email}`)
      reset()
      setShowInviteForm(false)
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (userId: string, userEmail: string) => {
    if (!confirm(`Remove ${userEmail} from the organization?`)) return

    setIsActionLoading(userId)
    try {
      const response = await fetch(`/api/v1/users?userId=${userId}`, { method: 'DELETE' })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to remove member')
        return
      }

      toast.success('Member removed')
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleChangeRole = async (userId: string, role: Role) => {
    setIsActionLoading(userId)
    try {
      const response = await fetch('/api/v1/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to change role')
        return
      }

      toast.success('Role updated')
      router.refresh()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      {canManage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Invite a team member</CardTitle>
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" />
              Invite
            </button>
          </CardHeader>

          {showInviteForm && (
            <CardContent>
              <form onSubmit={handleSubmit(onInvite)} className="flex gap-3">
                <div className="flex-1">
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="colleague@company.com"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                <select
                  {...register('role')}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="viewer">Viewer</option>
                  <option value="builder">Builder</option>
                  <option value="analytics_admin">Analytics Admin</option>
                  {currentRole === 'tenant_admin' && (
                    <option value="api_user">API User</option>
                  )}
                </select>

                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send invite
                </button>
              </form>
            </CardContent>
          )}
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Members ({members.filter((m) => m.inviteStatus === 'accepted').length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(member.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {member.user.name ?? member.user.email}
                      </p>
                      {member.user.mfaEnabled && (
                        <ShieldCheck className="h-3.5 w-3.5 text-green-500" title="MFA enabled" />
                      )}
                      {member.inviteStatus === 'pending' && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.user.name ? member.user.email : ''}
                      {member.user.lastLoginAt && (
                        <span className="ml-2">
                          · Last seen {formatRelativeTime(member.user.lastLoginAt)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={ROLE_VARIANT[member.role] ?? 'outline'}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>

                  {canManage && member.user.id !== currentUserId && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={isActionLoading === member.user.id}
                          className="rounded p-1 hover:bg-accent"
                        >
                          {isActionLoading === member.user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreVertical className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.user.id, 'analytics_admin')}
                        >
                          Make Analytics Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.user.id, 'builder')}
                        >
                          Make Builder
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleChangeRole(member.user.id, 'viewer')}
                        >
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            handleRemoveMember(member.user.id, member.user.email)
                          }
                          className="text-red-600 focus:text-red-600"
                        >
                          <UserX className="h-4 w-4" />
                          Remove member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
