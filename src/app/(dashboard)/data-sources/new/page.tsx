'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { ConnectorType } from '@/types/insightsforge'

// ─── Step 1: Connector selection ─────────────────────────────────────────────

type ConnectorOption = {
  value: ConnectorType
  label: string
  description: string
  category: 'sql' | 'cloud' | 'file' | 'api'
}

const CONNECTORS: ConnectorOption[] = [
  { value: 'postgresql', label: 'PostgreSQL', description: 'Open-source relational database', category: 'sql' },
  { value: 'mysql', label: 'MySQL', description: 'Popular open-source RDBMS', category: 'sql' },
  { value: 'mssql', label: 'SQL Server', description: "Microsoft's relational database", category: 'sql' },
  { value: 'bigquery', label: 'BigQuery', description: 'Google Cloud data warehouse', category: 'cloud' },
  { value: 'snowflake', label: 'Snowflake', description: 'Cloud data platform', category: 'cloud' },
  { value: 'redshift', label: 'Redshift', description: 'AWS cloud data warehouse', category: 'cloud' },
  { value: 'mongodb', label: 'MongoDB', description: 'NoSQL document database', category: 'sql' },
  { value: 'clickhouse', label: 'ClickHouse', description: 'OLAP columnar database', category: 'sql' },
  { value: 'rest_api', label: 'REST API', description: 'Connect to any HTTP endpoint', category: 'api' },
  { value: 'csv_upload', label: 'CSV Upload', description: 'Upload spreadsheet files', category: 'file' },
  { value: 'google_sheets', label: 'Google Sheets', description: 'Connect to a spreadsheet', category: 'api' },
]

// ─── Step 2: Connection form schemas ─────────────────────────────────────────

const sqlSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().min(1).max(65535),
  database: z.string().min(1, 'Database name is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  ssl: z.boolean().optional(),
})

const restApiSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  baseUrl: z.string().url('Must be a valid URL'),
  authType: z.enum(['none', 'bearer', 'basic', 'api_key']).optional(),
  authValue: z.string().optional(),
})

const csvSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type SqlFormData = z.infer<typeof sqlSchema>
type RestApiFormData = z.infer<typeof restApiSchema>
type CsvFormData = z.infer<typeof csvSchema>

const DEFAULT_PORTS: Partial<Record<ConnectorType, number>> = {
  postgresql: 5432,
  mysql: 3306,
  mssql: 1433,
  mongodb: 27017,
  clickhouse: 9000,
  redshift: 5439,
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function createDataSource(data: Record<string, unknown>): Promise<{ id: string }> {
  const res = await fetch('/api/v1/data-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Failed to create data source')
  }
  const json = await res.json()
  return json.data
}

async function testConnection(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/v1/data-sources/${id}/test`, { method: 'POST' })
  const json = await res.json()
  return { success: json.success, message: json.error ?? json.data?.message ?? '' }
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({
  current,
  steps,
}: {
  current: number
  steps: string[]
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              i < current
                ? 'bg-primary text-primary-foreground'
                : i === current
                ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={`text-sm ${
              i === current ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
          >
            {label}
          </span>
          {i < steps.length - 1 && (
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── SQL connection form ──────────────────────────────────────────────────────

function SqlConnectionForm({
  connectorType,
  onSubmit,
  isPending,
}: {
  connectorType: ConnectorType
  onSubmit: (data: Record<string, unknown>) => void
  isPending: boolean
}) {
  const defaultPort = DEFAULT_PORTS[connectorType] ?? 5432

  const { register, handleSubmit, formState: { errors } } = useForm<SqlFormData>({
    resolver: zodResolver(sqlSchema),
    defaultValues: { port: defaultPort },
  })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...d, type: connectorType }))} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Connection Name <span className="text-destructive">*</span></Label>
          <Input id="name" placeholder="e.g. Production Database" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" placeholder="Optional description" {...register('description')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="host">Host <span className="text-destructive">*</span></Label>
          <Input id="host" placeholder="localhost or db.example.com" {...register('host')} />
          {errors.host && <p className="text-xs text-destructive">{errors.host.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">Port <span className="text-destructive">*</span></Label>
          <Input id="port" type="number" {...register('port')} />
          {errors.port && <p className="text-xs text-destructive">{errors.port.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="database">Database <span className="text-destructive">*</span></Label>
          <Input id="database" placeholder="mydb" {...register('database')} />
          {errors.database && <p className="text-xs text-destructive">{errors.database.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
          <Input id="username" placeholder="postgres" {...register('username')} />
          {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPending ? 'Creating...' : 'Create & Test'}
        </Button>
      </div>
    </form>
  )
}

// ─── REST API form ────────────────────────────────────────────────────────────

function RestApiForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: Record<string, unknown>) => void
  isPending: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<RestApiFormData>({
    resolver: zodResolver(restApiSchema),
    defaultValues: { authType: 'none' },
  })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...d, type: 'rest_api' }))} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Connection Name <span className="text-destructive">*</span></Label>
          <Input id="name" placeholder="e.g. Sales API" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="baseUrl">Base URL <span className="text-destructive">*</span></Label>
          <Input id="baseUrl" placeholder="https://api.example.com/v1" {...register('baseUrl')} />
          {errors.baseUrl && <p className="text-xs text-destructive">{errors.baseUrl.message}</p>}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="authValue">Auth Token / API Key</Label>
          <Input id="authValue" type="password" placeholder="Bearer token or API key" {...register('authValue')} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPending ? 'Creating...' : 'Create & Test'}
        </Button>
      </div>
    </form>
  )
}

// ─── CSV form ─────────────────────────────────────────────────────────────────

function CsvForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: Record<string, unknown>) => void
  isPending: boolean
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<CsvFormData>({
    resolver: zodResolver(csvSchema),
  })

  return (
    <form onSubmit={handleSubmit((d) => onSubmit({ ...d, type: 'csv_upload' }))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Connection Name <span className="text-destructive">*</span></Label>
        <Input id="name" placeholder="e.g. Sales Data CSV" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label>CSV File</Label>
        <div className="rounded-md border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Drag and drop a CSV file here, or click to browse
          </p>
          <Button variant="outline" size="sm" className="mt-3" type="button">
            Browse Files
          </Button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPending ? 'Creating...' : 'Create'}
        </Button>
      </div>
    </form>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NewDataSourcePage() {
  const router = useRouter()
  const [step, setStep] = useState<0 | 1 | 2>(0)
  const [selectedType, setSelectedType] = useState<ConnectorType | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const createMutation = useMutation({
    mutationFn: createDataSource,
    onSuccess: async (data) => {
      setCreatedId(data.id)
      setStep(2)
      // Auto-test
      try {
        const result = await testConnection(data.id)
        setTestResult(result)
        if (result.success) {
          toast.success('Connection successful!')
        } else {
          toast.error('Connection test failed')
        }
      } catch {
        setTestResult({ success: false, message: 'Test request failed' })
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isSqlType =
    selectedType &&
    ['postgresql', 'mysql', 'mssql', 'bigquery', 'snowflake', 'redshift', 'mongodb', 'clickhouse', 'sqlite'].includes(
      selectedType,
    )

  const STEPS = ['Choose Connector', 'Connection Details', 'Test & Finish']

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/data-sources">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Data Source</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Connect a database, API or file to start building reports
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} steps={STEPS} />

      {/* Step 1: Choose connector */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a connector</CardTitle>
            <CardDescription>Select the type of data source you want to connect.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {CONNECTORS.map((connector) => (
                <button
                  key={connector.value}
                  type="button"
                  onClick={() => {
                    setSelectedType(connector.value)
                    setStep(1)
                  }}
                  className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <div className="rounded-md bg-muted p-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{connector.label}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {connector.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Connection form */}
      {step === 1 && selectedType && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <CardTitle>
                  Configure{' '}
                  {CONNECTORS.find((c) => c.value === selectedType)?.label ?? selectedType}
                </CardTitle>
                <CardDescription>Enter your connection details below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isSqlType ? (
              <SqlConnectionForm
                connectorType={selectedType}
                onSubmit={(d) => createMutation.mutate(d)}
                isPending={createMutation.isPending}
              />
            ) : selectedType === 'rest_api' ? (
              <RestApiForm
                onSubmit={(d) => createMutation.mutate(d)}
                isPending={createMutation.isPending}
              />
            ) : (
              <CsvForm
                onSubmit={(d) => createMutation.mutate(d)}
                isPending={createMutation.isPending}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Test result */}
      {step === 2 && createdId && (
        <Card>
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
            <CardDescription>Testing your connection to the data source.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!testResult ? (
              <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm">Testing connection...</p>
              </div>
            ) : testResult.success ? (
              <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-400">
                    Connection successful
                  </p>
                  {testResult.message && (
                    <p className="text-xs text-green-700 dark:text-green-500 mt-0.5">
                      {testResult.message}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4 dark:bg-red-950/30">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm font-medium text-destructive">Connection failed</p>
                  {testResult.message && (
                    <p className="text-xs text-muted-foreground mt-0.5">{testResult.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                disabled={!testResult}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Edit Details
              </Button>
              <Button
                className="flex-1"
                disabled={!testResult}
                onClick={() => router.push(`/data-sources/${createdId}`)}
              >
                Go to Data Source
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
