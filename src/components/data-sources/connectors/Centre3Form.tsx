'use client'

/**
 * Centre3Form
 *
 * A self-contained configuration form for the Centre3 pre-built connector.
 * Users supply only a Base URL and API Key — all field mappings are provided
 * automatically by the Centre3Connector field catalogue.
 */

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, XCircle, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const centre3Schema = z.object({
  baseUrl: z
    .string()
    .min(1, 'Base URL is required')
    .url('Must be a valid URL (e.g. https://api.centre3.io)'),
  apiKey: z.string().min(1, 'API Key is required'),
})

type Centre3FormValues = z.infer<typeof centre3Schema>

// ---------------------------------------------------------------------------
// Test-result state
// ---------------------------------------------------------------------------

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface TestResult {
  status: TestStatus
  latencyMs?: number
  error?: string
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Centre3FormProps {
  /** Called with the validated form values when the user saves. */
  onSubmit?: (values: Centre3FormValues) => void | Promise<void>
  /** Pre-populate the form when editing an existing data source. */
  defaultValues?: Partial<Centre3FormValues>
  /** When true, the save button shows a loading spinner. */
  isSubmitting?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Centre3Form({
  onSubmit,
  defaultValues,
  isSubmitting = false,
}: Centre3FormProps) {
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' })

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Centre3FormValues>({
    resolver: zodResolver(centre3Schema),
    defaultValues: {
      baseUrl: defaultValues?.baseUrl ?? '',
      apiKey: defaultValues?.apiKey ?? '',
    },
  })

  // -------------------------------------------------------------------------
  // Test connection
  // -------------------------------------------------------------------------

  async function handleTestConnection() {
    const { baseUrl, apiKey } = getValues()

    if (!baseUrl || !apiKey) {
      setTestResult({ status: 'error', error: 'Enter a Base URL and API Key before testing.' })
      return
    }

    setTestResult({ status: 'testing' })

    try {
      const response = await fetch('/api/v1/connectors/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'centre3', baseUrl, apiKey }),
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        setTestResult({ status: 'error', error: body.error ?? `HTTP ${response.status}` })
        return
      }

      const body = (await response.json()) as { data?: { latencyMs?: number } }
      setTestResult({ status: 'success', latencyMs: body.data?.latencyMs })
    } catch (err) {
      setTestResult({
        status: 'error',
        error: err instanceof Error ? err.message : 'Network error',
      })
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <form onSubmit={onSubmit ? handleSubmit(onSubmit) : undefined} className="space-y-5">
      {/* Base URL */}
      <div className="space-y-1.5">
        <Label htmlFor="centre3-base-url">
          Base URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="centre3-base-url"
          type="url"
          placeholder="https://api.centre3.io"
          autoComplete="off"
          {...register('baseUrl')}
        />
        {errors.baseUrl && (
          <p className="text-xs text-destructive">{errors.baseUrl.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The root URL of your Centre3 tenant API, without a trailing slash.
        </p>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label htmlFor="centre3-api-key">
          API Key <span className="text-destructive">*</span>
        </Label>
        <Input
          id="centre3-api-key"
          type="password"
          placeholder="c3_live_••••••••••••••••"
          autoComplete="new-password"
          {...register('apiKey')}
        />
        {errors.apiKey && (
          <p className="text-xs text-destructive">{errors.apiKey.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Sent as the <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">X-API-Key</code> header on every request.
          Generate or copy your key from the Centre3 admin portal.
        </p>
      </div>

      {/* Test connection */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={testResult.status === 'testing'}
          className="gap-2"
        >
          {testResult.status === 'testing' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wifi className="h-3.5 w-3.5" />
          )}
          Test Connection
        </Button>

        {testResult.status === 'success' && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
            <CardContent className="flex items-center gap-2 py-2 px-3 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Connected successfully
                {testResult.latencyMs !== undefined && (
                  <> &mdash; {testResult.latencyMs} ms</>
                )}
              </span>
            </CardContent>
          </Card>
        )}

        {testResult.status === 'error' && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-2 py-2 px-3 text-sm text-destructive">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>{testResult.error ?? 'Connection failed'}</span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Info callout */}
      <Card className="bg-muted/50">
        <CardContent className="py-3 px-4 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">What gets imported automatically</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Access Events — entry/exit logs with person and result details</li>
            <li>Power Metrics — rack-level kW draw, PUE, temperature and humidity</li>
            <li>Support Tickets — status, priority, SLA tracking</li>
            <li>Billing — invoice history with status and amounts</li>
            <li>Visitors — check-in/out log with host and badge data</li>
          </ul>
          <p className="pt-1">
            No manual field mapping required. All fields are pre-configured.
          </p>
        </CardContent>
      </Card>

      {/* Save */}
      {onSubmit && (
        <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Centre3 Connection
        </Button>
      )}
    </form>
  )
}
