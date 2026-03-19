'use client'

import { useState, useCallback } from 'react'
import { Play, Clock, Rows } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChartRenderer } from '@/components/charts/ChartRenderer'
import type { ReportDefinition, QueryResult, ChartConfig } from '@/lib/query-engine/types'

// ---------------------------------------------------------------------------
// Mock data generator – used when no reportId is provided
// ---------------------------------------------------------------------------

function generateMockQueryResult(definition: ReportDefinition): QueryResult {
  const STRING_SAMPLES = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
    'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
  ]

  const visibleFields = definition.fields.filter((f) => f.visible !== false)

  if (visibleFields.length === 0) {
    return { rows: [], columns: [], totalRows: 0, queryTimeMs: 0 }
  }

  const columns = visibleFields.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    field: f.aggregation ? `${f.aggregation}_${f.columnName}` : f.columnName,
    aggregation: f.aggregation,
  }))

  const ROWS = 20
  const rows: Record<string, unknown>[] = []
  for (let i = 0; i < ROWS; i++) {
    const row: Record<string, unknown> = {}
    for (const col of columns) {
      switch (col.type) {
        case 'number':
          row[col.field] = Math.round(Math.random() * 100_000) / 100
          break
        case 'date':
          row[col.field] = new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          ).toISOString()
          break
        case 'boolean':
          row[col.field] = Math.random() > 0.5
          break
        default:
          row[col.field] = STRING_SAMPLES[i % STRING_SAMPLES.length]
          break
      }
    }
    rows.push(row)
  }

  return {
    rows,
    columns,
    totalRows: rows.length,
    queryTimeMs: Math.round(Math.random() * 120 + 5),
    cached: false,
    truncated: false,
  }
}

// ---------------------------------------------------------------------------
// ReportPreview
// ---------------------------------------------------------------------------

interface ReportPreviewProps {
  reportId?: string
  definition: ReportDefinition
  dataSourceId: string
}

export function ReportPreview({ reportId, definition, dataSourceId }: ReportPreviewProps) {
  const [result, setResult] = useState<QueryResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runQuery = useCallback(async () => {
    setIsRunning(true)
    setError(null)
    setResult(null)

    try {
      if (reportId) {
        // Hit the real API endpoint when a saved reportId is available
        const res = await fetch(`/api/v1/reports/${reportId}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ definition }),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? `Request failed with status ${res.status}`)
        }

        const json = (await res.json()) as { success: boolean; data?: QueryResult; error?: string }
        if (!json.success || !json.data) {
          throw new Error(json.error ?? 'Unexpected response from server')
        }

        setResult(json.data)
      } else {
        // No saved report – generate demo data client-side
        await new Promise<void>((resolve) => setTimeout(resolve, 250))
        const mock = generateMockQueryResult(definition)
        setResult(mock)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsRunning(false)
    }
  }, [reportId, definition])

  // Derive chart config from the definition (fall back to table view)
  const chartConfig: ChartConfig = definition.chartConfig ?? { type: 'bar' }

  const hasFields = definition.fields.filter((f) => f.visible !== false).length > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          onClick={runQuery}
          disabled={isRunning || !hasFields}
          size="sm"
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          {isRunning ? 'Running…' : 'Run Query'}
        </Button>

        {result && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Rows className="h-3.5 w-3.5" />
              {result.totalRows.toLocaleString()} rows
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {result.queryTimeMs} ms
              {result.cached && (
                <span className="ml-1 rounded bg-muted px-1 py-0.5 font-medium">cached</span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasFields && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 py-16 text-sm text-muted-foreground">
          Add fields to your report to preview results.
        </div>
      )}

      {/* Loading state */}
      {isRunning && (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <svg
              className="h-6 w-6 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span className="text-sm">Executing query…</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isRunning && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          <p className="font-semibold">Query failed</p>
          <p className="mt-1 font-mono text-xs">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && !isRunning && (
        <div className="rounded-lg border border-border">
          <ChartRenderer
            config={chartConfig}
            data={result}
            height={400}
          />
        </div>
      )}
    </div>
  )
}
