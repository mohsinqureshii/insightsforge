import { BaseConnector, ConnectorConfig } from './base'
import { PostgreSQLConnector } from './postgresql'
import { RestApiConnector } from './rest-api'
import { CsvConnector } from './csv'
import { WebhookConnector } from './webhook'
import type { ConnectorType } from '@/types/insightsforge'

// Re-export all types and connectors
export type { ConnectorConfig, FieldDefinition, ConnectorTestResult, QueryResult } from './base'
export { BaseConnector } from './base'
export { PostgreSQLConnector } from './postgresql'
export { RestApiConnector } from './rest-api'
export { CsvConnector } from './csv'
export { WebhookConnector, generateWebhookCredentials, verifyWebhookSignature, storeWebhookEvent } from './webhook'

// Singleton connector instances (created once, stateless)
const connectorRegistry = new Map<string, BaseConnector>()

function getOrCreate<T extends BaseConnector>(key: string, factory: () => T): T {
  if (!connectorRegistry.has(key)) {
    connectorRegistry.set(key, factory())
  }
  return connectorRegistry.get(key) as T
}

/**
 * Get the appropriate connector instance for a given connector type.
 * Returns null if the connector type is not yet implemented.
 */
export function getConnector(type: ConnectorType): BaseConnector | null {
  switch (type) {
    case 'postgresql':
      return getOrCreate('postgresql', () => new PostgreSQLConnector())

    case 'rest_api':
      return getOrCreate('rest_api', () => new RestApiConnector())

    case 'csv_upload':
      return getOrCreate('csv_upload', () => new CsvConnector())

    case 'webhook' as ConnectorType:
      return getOrCreate('webhook', () => new WebhookConnector())

    // Planned connectors — return null for now
    case 'mysql':
    case 'mssql':
    case 'bigquery':
    case 'snowflake':
    case 'redshift':
    case 'mongodb':
    case 'clickhouse':
    case 'sqlite':
    case 'google_sheets':
      return null

    default:
      return null
  }
}

/**
 * List of connector types that are currently implemented.
 */
export const SUPPORTED_CONNECTORS: ConnectorType[] = [
  'postgresql',
  'rest_api',
  'csv_upload',
]

/**
 * Check if a connector type is supported.
 */
export function isConnectorSupported(type: ConnectorType): boolean {
  return SUPPORTED_CONNECTORS.includes(type)
}

/**
 * Metadata about each connector type for UI display.
 */
export const CONNECTOR_METADATA: Record<
  ConnectorType,
  { label: string; icon: string; description: string; supported: boolean }
> = {
  postgresql: {
    label: 'PostgreSQL',
    icon: 'database',
    description: 'Connect to any PostgreSQL database',
    supported: true,
  },
  mysql: {
    label: 'MySQL',
    icon: 'database',
    description: 'Connect to MySQL or MariaDB',
    supported: false,
  },
  mssql: {
    label: 'SQL Server',
    icon: 'database',
    description: 'Connect to Microsoft SQL Server',
    supported: false,
  },
  bigquery: {
    label: 'BigQuery',
    icon: 'cloud',
    description: 'Connect to Google BigQuery',
    supported: false,
  },
  snowflake: {
    label: 'Snowflake',
    icon: 'cloud',
    description: 'Connect to Snowflake data warehouse',
    supported: false,
  },
  redshift: {
    label: 'Redshift',
    icon: 'cloud',
    description: 'Connect to Amazon Redshift',
    supported: false,
  },
  mongodb: {
    label: 'MongoDB',
    icon: 'database',
    description: 'Connect to MongoDB collections',
    supported: false,
  },
  clickhouse: {
    label: 'ClickHouse',
    icon: 'database',
    description: 'Connect to ClickHouse for analytics',
    supported: false,
  },
  sqlite: {
    label: 'SQLite',
    icon: 'database',
    description: 'Connect to a SQLite database file',
    supported: false,
  },
  csv_upload: {
    label: 'CSV / Excel',
    icon: 'file-spreadsheet',
    description: 'Upload CSV or Excel files',
    supported: true,
  },
  rest_api: {
    label: 'REST API',
    icon: 'globe',
    description: 'Connect to any REST API endpoint',
    supported: true,
  },
  google_sheets: {
    label: 'Google Sheets',
    icon: 'table',
    description: 'Connect to Google Sheets',
    supported: false,
  },
}

export default getConnector
