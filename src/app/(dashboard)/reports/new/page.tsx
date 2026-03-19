'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, Table2, LineChart, PieChart, TrendingUp, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { ReportType, DataSource } from '@/types/insightsforge'

const createReportSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  dataSourceId: z.string().optional(),
  type: z.enum(['table', 'chart', 'metric', 'pivot', 'funnel', 'cohort', 'custom_sql']),
})

type CreateReportInput = z.infer<typeof createReportSchema>

type ReportTypeOption = {
  value: ReportType
  label: string
  description: string
  icon: React.ReactNode
}

const REPORT_TYPES: ReportTypeOption[] = [
  {
    value: 'table',
    label: 'Table',
    description: 'Rows and columns of data',
    icon: <Table2 className="h-5 w-5" />,
  },
  {
    value: 'chart',
    label: 'Chart',
    description: 'Bar, line, pie and more',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    value: 'metric',
    label: 'Metric / KPI',
    description: 'Single number with trend',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    value: 'pivot',
    label: 'Pivot Table',
    description: 'Aggregated cross-tab view',
    icon: <Table2 className="h-5 w-5" />,
  },
  {
    value: 'funnel',
    label: 'Funnel',
    description: 'Conversion funnel analysis',
    icon: <LineChart className="h-5 w-5" />,
  },
  {
    value: 'custom_sql',
    label: 'Custom SQL',
    description: 'Write your own query',
    icon: <Code2 className="h-5 w-5" />,
  },
]

async function fetchDataSources(): Promise<DataSource[]> {
  const res = await fetch('/api/v1/data-sources')
  if (!res.ok) throw new Error('Failed to load data sources')
  const json = await res.json()
  return json.data ?? []
}

async function createReport(data: CreateReportInput): Promise<{ id: string }> {
  const res = await fetch('/api/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error ?? 'Failed to create report')
  }
  const json = await res.json()
  return json.data
}

export default function NewReportPage() {
  const router = useRouter()
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loadingSources, setLoadingSources] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<CreateReportInput>({
    resolver: zodResolver(createReportSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'table',
    },
  })

  const selectedType = watch('type')

  useEffect(() => {
    fetchDataSources()
      .then(setDataSources)
      .catch(() => toast.error('Could not load data sources'))
      .finally(() => setLoadingSources(false))
  }, [])

  const createMutation = useMutation({
    mutationFn: createReport,
    onSuccess: (data) => {
      toast.success('Report created!')
      router.push(`/reports/${data.id}/edit`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const onSubmit = (values: CreateReportInput) => {
    createMutation.mutate(values)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/reports">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Report</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Choose a type and data source to get started
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
            <CardDescription>Give your report a name and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Monthly Revenue, User Retention"
                autoFocus
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional: describe what this report shows"
                rows={3}
                className="resize-none"
                {...register('description')}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Type */}
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
            <CardDescription>Select the visualization type for your report.</CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {REPORT_TYPES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => field.onChange(option.value)}
                      className={`flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 ${
                        field.value === option.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border'
                      }`}
                    >
                      <div
                        className={`rounded-md p-1.5 ${
                          field.value === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            />
            {errors.type && (
              <p className="mt-2 text-xs text-destructive">{errors.type.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Data Source */}
        <Card>
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
            <CardDescription>
              Choose the data source this report will query.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Controller
              name="dataSourceId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? ''}
                  onValueChange={(v) => field.onChange(v || undefined)}
                  disabled={loadingSources}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSources ? 'Loading data sources...' : 'Select a data source'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No data source (manual SQL)</SelectItem>
                    {dataSources.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                        <span className="ml-2 text-xs text-muted-foreground capitalize">
                          ({ds.type.replace('_', ' ')})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {dataSources.length === 0 && !loadingSources && (
              <p className="mt-2 text-xs text-muted-foreground">
                No data sources connected.{' '}
                <Link href="/data-sources/new" className="text-primary hover:underline">
                  Add one first
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" type="button" asChild>
            <Link href="/reports">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating...' : 'Create Report'}
          </Button>
        </div>
      </form>
    </div>
  )
}
