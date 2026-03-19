'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const settingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  timezone: z.string(),
  locale: z.string(),
  theme: z.enum(['light', 'dark', 'system']),
})

type SettingsData = z.infer<typeof settingsSchema>

interface SettingsFormProps {
  tenant: {
    id: string
    name: string
    slug: string
    plan: string
    settings: Record<string, unknown>
  }
  canEdit: boolean
}

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  business: 'Business',
  enterprise: 'Enterprise',
}

const PLAN_COLORS: Record<string, 'default' | 'info' | 'success'> = {
  starter: 'default',
  business: 'info',
  enterprise: 'success',
}

export function SettingsForm({ tenant, canEdit }: SettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<SettingsData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: tenant.name,
      timezone: (tenant.settings.timezone as string) ?? 'UTC',
      locale: (tenant.settings.locale as string) ?? 'en-US',
      theme: ((tenant.settings.theme as string) ?? 'system') as 'light' | 'dark' | 'system',
    },
  })

  const onSubmit = async (data: SettingsData) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/v1/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          settings: {
            timezone: data.timezone,
            locale: data.locale,
            theme: data.theme,
          },
        }),
      })
      const result = await response.json() as { success: boolean; error?: string }

      if (!result.success) {
        toast.error(result.error ?? 'Failed to save settings')
        return
      }

      toast.success('Settings saved successfully')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Plan info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Current Plan</span>
            <Badge variant={PLAN_COLORS[tenant.plan] ?? 'default'}>
              {PLAN_LABELS[tenant.plan] ?? tenant.plan}
            </Badge>
          </CardTitle>
          <CardDescription>
            Your organization is on the {PLAN_LABELS[tenant.plan] ?? tenant.plan} plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Organization ID', value: tenant.id.slice(0, 12) + '...' },
              { label: 'Slug', value: tenant.slug },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-muted-foreground">{item.label}</p>
                <p className="font-mono font-medium">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* General settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            General
          </CardTitle>
          <CardDescription>Configure your organization&apos;s name and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Organization name</label>
              <input
                {...register('name')}
                type="text"
                disabled={!canEdit}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Timezone</label>
                <select
                  {...register('timezone')}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {[
                    'UTC',
                    'America/New_York',
                    'America/Chicago',
                    'America/Denver',
                    'America/Los_Angeles',
                    'Europe/London',
                    'Europe/Paris',
                    'Europe/Berlin',
                    'Asia/Tokyo',
                    'Asia/Singapore',
                    'Australia/Sydney',
                  ].map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">Theme</label>
                <select
                  {...register('theme')}
                  disabled={!canEdit}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="system">System default</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            {canEdit && (
              <button
                type="submit"
                disabled={isSaving || !isDirty}
                className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save settings
              </button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
