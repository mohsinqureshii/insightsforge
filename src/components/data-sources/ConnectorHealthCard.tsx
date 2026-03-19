/**
 * ConnectorHealthCard
 *
 * A status card for the Connector Health dashboard section on the Data Sources
 * page. Displays the connector name, a type badge, the last-tested timestamp,
 * a colour-coded status indicator, and the most recent latency reading.
 *
 * Designed to be used as a Server Component — all data is passed as props.
 */

import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import type { ConnectorType } from '@/types/insightsforge'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectorHealthStatus = 'healthy' | 'degraded' | 'error' | 'unknown'

export interface ConnectorHealthCardProps {
  /** Display name of the data source (user-defined). */
  name: string
  /** Connector type used for the badge label. */
  type: ConnectorType
  /** ISO timestamp of the last successful or failed connection test. */
  lastTestedAt: Date | null
  /** Current health status. */
  status: ConnectorHealthStatus
  /** Round-trip latency in milliseconds from the last test. */
  latencyMs?: number | null
}

// ---------------------------------------------------------------------------
// Static maps
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<ConnectorType, string> = {
  postgresql: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  bigquery: 'BigQuery',
  snowflake: 'Snowflake',
  redshift: 'Redshift',
  mongodb: 'MongoDB',
  clickhouse: 'ClickHouse',
  sqlite: 'SQLite',
  csv_upload: 'CSV',
  rest_api: 'REST API',
  google_sheets: 'Google Sheets',
  centre3: 'Centre3',
  opssense: 'OpsSense',
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: ConnectorHealthStatus }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'degraded':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />
  }
}

function statusLabel(status: ConnectorHealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'degraded':
      return 'Degraded'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
}

function statusTextClass(status: ConnectorHealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'text-green-600 dark:text-green-400'
    case 'degraded':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'error':
      return 'text-destructive'
    default:
      return 'text-muted-foreground'
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConnectorHealthCard({
  name,
  type,
  lastTestedAt,
  status,
  latencyMs,
}: ConnectorHealthCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{name}</p>
          <Badge variant="secondary" className="mt-1 text-xs font-normal">
            {TYPE_LABELS[type] ?? type}
          </Badge>
        </div>

        {/* Status indicator */}
        <div className={`flex items-center gap-1 shrink-0 text-xs font-medium ${statusTextClass(status)}`}>
          <StatusIcon status={status} />
          <span>{statusLabel(status)}</span>
        </div>
      </div>

      {/* Footer row */}
      <CardContent className="p-0 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {/* Last tested */}
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 shrink-0" />
          {lastTestedAt ? (
            <span>Tested {formatRelativeTime(lastTestedAt)}</span>
          ) : (
            <span className="italic">Never tested</span>
          )}
        </div>

        {/* Latency */}
        {latencyMs != null && (
          <span className="tabular-nums">{latencyMs} ms</span>
        )}
      </CardContent>
    </Card>
  )
}

export default ConnectorHealthCard
