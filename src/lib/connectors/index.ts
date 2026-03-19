import { BaseConnector, ConnectorConfig } from './base'
import { PostgreSQLConnector } from './postgresql'
import { RestApiConnector } from './rest-api'
import { CsvConnector } from './csv'
import { WebhookConnector } from './webhook'
import { Centre3Connector } from './centre3'
import { OpsSenseConnector } from './opssense'
import type { ConnectorType } from '@/types/insightsforge'

// Re-export all types and connectors
export type { ConnectorConfig, FieldDefinition, ConnectorTestResult, QueryResult } from './base'
export { BaseConnector } from './base'
export { PostgreSQLConnector } from './postgresql'
export { RestApiConnector } from './rest-api'
export { CsvConnector } from './csv'
export { WebhookConnector, generateWebhookCredentials, verifyWebhookSignature, storeWebhookEvent } from './webhook'
export { Centre3Connector, centre3Connector, CENTRE3_ENDPOINTS } from './centre3'
export type { Centre3Config, Centre3Endpoint, Centre3FieldDefinition, Centre3FieldType } from './centre3'
export { OpsSenseConnector, opsSenseConnector, OPSSENSE_ENDPOINTS } from './opssense'
export type { OpsSenseConfig, OpsSenseEndpoint, OpsSenseFieldDefinition, OpsSenseFieldType } from './opssense'

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

    // Pre-built connectors — managed via their own connector classes.
    // These do not extend BaseConnector directly; use getCentre3Connector()
    // or getOpsSenseConnector() for full access to their typed APIs.
    case 'centre3':
    case 'opssense':
      return null

    default:
      return null
  }
}

/**
 * Get the Centre3 connector instance.
 * Centre3 exposes testConnection(), getFieldCatalogue(), and fetchData()
 * rather than the generic BaseConnector interface.
 */
export function getCentre3Connector(): Centre3Connector {
  return getOrCreate('centre3', () => new Centre3Connector()) as unknown as Centre3Connector
}

/**
 * Get the OpsSense connector instance.
 * OpsSense exposes testConnection(), getFieldCatalogue(), and fetchData()
 * rather than the generic BaseConnector interface.
 */
export function getOpsSenseConnector(): OpsSenseConnector {
  return getOrCreate('opssense', () => new OpsSenseConnector()) as unknown as OpsSenseConnector
}

/**
 * List of connector types that are currently implemented.
 */
export const SUPPORTED_CONNECTORS: ConnectorType[] = [
  'postgresql',
  'rest_api',
  'csv_upload',
  'centre3',
  'opssense',
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
