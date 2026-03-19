'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const brandingSchema = z.object({
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(100, 'Company name must be at most 100 characters'),
  logoUrl: z
    .string()
    .url('Please enter a valid URL')
    .or(z.literal(''))
    .optional(),
  primaryColor: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a valid hex color (e.g. #6366f1)')
    .or(z.literal(''))
    .optional(),
  customDomain: z
    .string()
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      'Please enter a valid domain name (e.g. analytics.company.com)',
    )
    .or(z.literal(''))
    .optional(),
})

type BrandingFormValues = z.infer<typeof brandingSchema>

interface BrandingFormProps {
  defaultValues?: Partial<BrandingFormValues>
}

export function BrandingForm({ defaultValues }: BrandingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      companyName: '',
      logoUrl: '',
      primaryColor: '',
      customDomain: '',
      ...defaultValues,
    },
  })

  const onSubmit = async (values: BrandingFormValues) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to update branding settings')
      }

      toast.success('Branding settings saved')
      reset(values)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding</CardTitle>
        <CardDescription>
          Customise how your workspace appears to users.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              placeholder="Acme Corporation"
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          {/* Logo URL */}
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              placeholder="https://example.com/logo.png"
              {...register('logoUrl')}
            />
            {errors.logoUrl && (
              <p className="text-sm text-destructive">{errors.logoUrl.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Hosted image URL for your company logo (PNG, SVG recommended).
            </p>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-3">
              <Input
                id="primaryColor"
                placeholder="#6366f1"
                className="font-mono"
                {...register('primaryColor')}
              />
              <input
                type="color"
                className="h-10 w-12 cursor-pointer rounded-lg border border-input p-1"
                aria-label="Color picker"
                onChange={(e) => {
                  // Sync the hex input from the colour picker
                  const event = new Event('input', { bubbles: true })
                  const input = document.getElementById('primaryColor') as HTMLInputElement | null
                  if (input) {
                    input.value = e.target.value
                    input.dispatchEvent(event)
                  }
                }}
              />
            </div>
            {errors.primaryColor && (
              <p className="text-sm text-destructive">{errors.primaryColor.message}</p>
            )}
          </div>

          {/* Custom Domain */}
          <div className="space-y-2">
            <Label htmlFor="customDomain">Custom Domain</Label>
            <Input
              id="customDomain"
              placeholder="analytics.yourcompany.com"
              {...register('customDomain')}
            />
            {errors.customDomain && (
              <p className="text-sm text-destructive">{errors.customDomain.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Point a CNAME record to{' '}
              <span className="font-mono">app.insightsforge.io</span> to activate your custom
              domain.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={!isDirty || isSubmitting}
          >
            Discard
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
