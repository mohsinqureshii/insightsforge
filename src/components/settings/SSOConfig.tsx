'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const ssoSchema = z.object({
  provider: z.enum(['saml', 'oidc'], {
    required_error: 'Please select a provider',
    invalid_type_error: 'Please select a valid provider',
  }),
  entityId: z
    .string()
    .min(1, 'Entity ID / Client ID is required')
    .max(500, 'Entity ID must be at most 500 characters'),
  ssoUrl: z
    .string()
    .url('Please enter a valid URL')
    .min(1, 'SSO URL is required'),
  certificate: z
    .string()
    .min(1, 'Certificate / Client Secret is required')
    .max(10_000, 'Certificate is too long'),
})

type SSOFormValues = z.infer<typeof ssoSchema>

const PROVIDER_LABELS: Record<SSOFormValues['provider'], string> = {
  saml: 'SAML 2.0',
  oidc: 'OpenID Connect (OIDC)',
}

interface SSOConfigProps {
  defaultValues?: Partial<SSOFormValues>
}

export function SSOConfig({ defaultValues }: SSOConfigProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<SSOFormValues>({
    resolver: zodResolver(ssoSchema),
    defaultValues: {
      provider: 'saml',
      entityId: '',
      ssoUrl: '',
      certificate: '',
      ...defaultValues,
    },
  })

  const selectedProvider = watch('provider')
  const isSaml = selectedProvider === 'saml'

  const onSubmit = async (values: SSOFormValues) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/v1/tenants/sso', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Failed to save SSO configuration')
      }

      toast.success('SSO configuration saved')
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
        <CardTitle>Single Sign-On (SSO)</CardTitle>
        <CardDescription>
          Configure SAML or OIDC-based SSO for your organisation. All members will be required to
          authenticate via your identity provider.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* Info banner */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Before you begin</AlertTitle>
            <AlertDescription>
              {isSaml
                ? 'Register InsightForge as a Service Provider in your IdP. Use the ACS URL and SP Entity ID provided below.'
                : 'Create an OIDC application in your IdP and provide the Client ID, Issuer URL, and Client Secret.'}
            </AlertDescription>
          </Alert>

          {/* Provider Select */}
          <div className="space-y-2">
            <Label htmlFor="provider">SSO Provider</Label>
            <select
              id="provider"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('provider')}
            >
              {(Object.keys(PROVIDER_LABELS) as SSOFormValues['provider'][]).map((key) => (
                <option key={key} value={key}>
                  {PROVIDER_LABELS[key]}
                </option>
              ))}
            </select>
            {errors.provider && (
              <p className="text-sm text-destructive">{errors.provider.message}</p>
            )}
          </div>

          {/* Entity ID / Client ID */}
          <div className="space-y-2">
            <Label htmlFor="entityId">{isSaml ? 'IdP Entity ID' : 'Client ID'}</Label>
            <Input
              id="entityId"
              placeholder={
                isSaml
                  ? 'https://idp.example.com/saml/metadata'
                  : 'your-client-id'
              }
              {...register('entityId')}
            />
            {errors.entityId && (
              <p className="text-sm text-destructive">{errors.entityId.message}</p>
            )}
          </div>

          {/* SSO URL / Issuer URL */}
          <div className="space-y-2">
            <Label htmlFor="ssoUrl">{isSaml ? 'IdP SSO URL' : 'Issuer / Discovery URL'}</Label>
            <Input
              id="ssoUrl"
              type="url"
              placeholder={
                isSaml
                  ? 'https://idp.example.com/saml/sso'
                  : 'https://accounts.google.com/.well-known/openid-configuration'
              }
              {...register('ssoUrl')}
            />
            {errors.ssoUrl && (
              <p className="text-sm text-destructive">{errors.ssoUrl.message}</p>
            )}
          </div>

          {/* Certificate / Client Secret */}
          <div className="space-y-2">
            <Label htmlFor="certificate">
              {isSaml ? 'X.509 Certificate' : 'Client Secret'}
            </Label>
            <textarea
              id="certificate"
              rows={isSaml ? 6 : 2}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
              placeholder={
                isSaml
                  ? '-----BEGIN CERTIFICATE-----\nMIIC...\n-----END CERTIFICATE-----'
                  : 'your-client-secret'
              }
              {...register('certificate')}
            />
            {errors.certificate && (
              <p className="text-sm text-destructive">{errors.certificate.message}</p>
            )}
            {isSaml && (
              <p className="text-xs text-muted-foreground">
                Paste the PEM-encoded X.509 signing certificate from your identity provider.
              </p>
            )}
          </div>

          {/* Read-only reference values */}
          {isSaml && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <p className="text-sm font-medium">Your Service Provider Details</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">ACS URL</p>
                  <p className="text-sm font-mono break-all">
                    https://app.insightsforge.io/api/auth/saml/callback
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">SP Entity ID</p>
                  <p className="text-sm font-mono break-all">
                    https://app.insightsforge.io/saml/metadata
                  </p>
                </div>
              </div>
            </div>
          )}
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
            Save SSO Configuration
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
