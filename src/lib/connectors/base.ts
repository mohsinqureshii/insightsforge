// Base connector interface that all connectors implement

export interface ConnectorConfig {
  type: string
  [key: string]: unknown
}

export interface FieldDefinition {
  name: string
  displayName: string
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'json' | 'geography'
  nullable: boolean
  isPrimaryKey?: boolean
  isSensitive?: boolean
  enumValues?: string[]
  description?: string
}

export interface ConnectorTestResult {
  success: boolean
  latencyMs: number
  recordCount?: number
  error?: string
  previewRows?: Record<string, unknown>[]
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  totalCount: number
  queryTimeMs: number
}

export abstract class BaseConnector {
  abstract test(config: ConnectorConfig): Promise<ConnectorTestResult>
  abstract introspect(config: ConnectorConfig): Promise<FieldDefinition[]>
  abstract query(config: ConnectorConfig, sql: string, params: unknown[]): Promise<QueryResult>
  abstract getDistinctValues(
    config: ConnectorConfig,
    field: string,
    search?: string,
  ): Promise<string[]>
}
