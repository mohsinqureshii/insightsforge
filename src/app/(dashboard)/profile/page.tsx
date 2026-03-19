'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Shield, ShieldCheck, User } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ProfileData = z.infer<typeof profileSchema>
type PasswordData = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const profileForm = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: session?.user?.name ?? '' },
  })

  const passwordForm = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
  })

  const onUpdateProfile = async (data: ProfileData) => {
    setIsUpdatingProfile(true)
    try {
      const response = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to update profile')
        return
      }

      await update({ name: data.name })
      toast.success('Profile updated successfully')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onChangePassword = async (data: PasswordData) => {
    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/v1/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to change password')
        return
      }

      toast.success('Password changed successfully')
      passwordForm.reset()
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your personal account information and security settings.
        </p>
      </div>

      {/* Profile info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          <CardDescription>Update your name and profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image ?? undefined} />
              <AvatarFallback className="text-lg">
                {getInitials(session?.user?.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{session?.user?.name ?? 'User'}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>

          <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Full name</label>
              <input
                {...profileForm.register('name')}
                type="text"
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {profileForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-500">
                  {profileForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email address</label>
              <input
                type="email"
                value={session?.user?.email ?? ''}
                disabled
                className="w-full rounded-lg border border-input bg-muted px-3 py-2.5 text-sm text-muted-foreground"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Email cannot be changed. Contact support if needed.
              </p>
            </div>
            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isUpdatingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Security
          </CardTitle>
          <CardDescription>Change your password and manage two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* MFA status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {session?.user?.mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground">
                  {session?.user?.mfaEnabled
                    ? 'Enabled – Your account is protected with TOTP.'
                    : 'Not enabled – Add an extra layer of security.'}
                </p>
              </div>
            </div>
            <Badge variant={session?.user?.mfaEnabled ? 'success' : 'outline'}>
              {session?.user?.mfaEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          {/* Password change */}
          <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
            <h3 className="text-sm font-semibold">Change password</h3>
            {(
              [
                { id: 'currentPassword', label: 'Current password', type: 'password' },
                { id: 'newPassword', label: 'New password', type: 'password' },
                { id: 'confirmPassword', label: 'Confirm new password', type: 'password' },
              ] as const
            ).map((field) => (
              <div key={field.id}>
                <label className="mb-1.5 block text-sm font-medium">{field.label}</label>
                <input
                  {...passwordForm.register(field.id)}
                  type={field.type}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                {passwordForm.formState.errors[field.id] && (
                  <p className="mt-1 text-xs text-red-500">
                    {passwordForm.formState.errors[field.id]?.message}
                  </p>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={isChangingPassword}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
