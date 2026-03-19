'use client'

/**
 * OpsSenseForm
 *
 * A self-contained configuration form for the OpsSense pre-built connector.
 * Users supply only a Base URL and API Key — all 14 OpsSense module field
 * mappings are provided automatically by the OpsSenseConnector field catalogue.
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

const opsSenseSchema = z.object({
  baseUrl: z
    .string()
    .min(1, 'Base URL is required')
    .url('Must be a valid URL (e.g. https://api.opssense.io)'),
  apiKey: z.string().min(1, 'API Key is required'),
})

type OpsSenseFormValues = z.infer<typeof opsSenseSchema>

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

interface OpsSenseFormProps {
  /** Called with the validated form values when the user saves. */
  onSubmit?: (values: OpsSenseFormValues) => void | Promise<void>
  /** Pre-populate the form when editing an existing data source. */
  defaultValues?: Partial<OpsSenseFormValues>
  /** When true, the save button shows a loading spinner. */
  isSubmitting?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OpsSenseForm({
  onSubmit,
  defaultValues,
  isSubmitting = false,
}: OpsSenseFormProps) {
  const [testResult, setTestResult] = useState<TestResult>({ status: 'idle' })

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<OpsSenseFormValues>({
    resolver: zodResolver(opsSenseSchema),
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
        body: JSON.stringify({ type: 'opssense', baseUrl, apiKey }),
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
        <Label htmlFor="opssense-base-url">
          Base URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="opssense-base-url"
          type="url"
          placeholder="https://api.opssense.io"
          autoComplete="off"
          {...register('baseUrl')}
        />
        {errors.baseUrl && (
          <p className="text-xs text-destructive">{errors.baseUrl.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          The root URL of your OpsSense instance, without a trailing slash.
        </p>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label htmlFor="opssense-api-key">
          API Key <span className="text-destructive">*</span>
        </Label>
        <Input
          id="opssense-api-key"
          type="password"
          placeholder="ops_live_••••••••••••••••"
          autoComplete="new-password"
          {...register('apiKey')}
        />
        {errors.apiKey && (
          <p className="text-xs text-destructive">{errors.apiKey.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Sent as a{' '}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            Authorization: Bearer &lt;key&gt;
          </code>{' '}
          header. Generate or copy your key from the OpsSense admin settings.
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
          <p className="font-medium text-foreground">14 modules imported automatically</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Work Orders — full lifecycle with SLA and cost tracking</li>
            <li>Assets — health scores, maintenance schedules, replacement cost</li>
            <li>Preventive Maintenance — schedules, frequencies and completion status</li>
            <li>Incidents — severity, downtime, root cause analysis</li>
            <li>Inspections — scores, pass/fail, findings count</li>
            <li>Spare Parts — inventory levels, reorder points, supplier data</li>
            <li>Purchase Orders — approval workflow and spend tracking</li>
            <li>Contractors — ratings, active contracts, YTD spend</li>
            <li>Permits — issuance, expiry, and revocation status</li>
            <li>Safety Observations — unsafe acts, near misses, positive observations</li>
            <li>Energy Readings — meter-level kWh and cost tracking</li>
            <li>KPI Dashboard — on-track/at-risk/off-track metrics</li>
            <li>Audit Trail — user actions across all resource types</li>
            <li>Sites — regional overview with WO counts and SLA compliance</li>
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
          Save OpsSense Connection
        </Button>
      )}
    </form>
  )
}
