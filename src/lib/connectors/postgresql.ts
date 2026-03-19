import { Pool, PoolClient, QueryResult as PgQueryResult } from 'pg'
import { BaseConnector, ConnectorConfig, ConnectorTestResult, FieldDefinition, QueryResult } from './base'

export interface PostgreSQLConfig extends ConnectorConfig {
  type: 'postgresql'
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
  sslCert?: string
  schema?: string
  connectionTimeoutMs?: number
  queryTimeoutMs?: number
}

// Map PostgreSQL data types to our abstract field types
function pgTypeToFieldType(
  pgType: string,
): 'string' | 'number' | 'date' | 'boolean' | 'enum' | 'json' | 'geography' {
  const type = pgType.toLowerCase().replace(/\[\]$/, '').trim()

  if (['int2', 'int4', 'int8', 'integer', 'bigint', 'smallint', 'serial', 'bigserial',
       'numeric', 'decimal', 'float4', 'float8', 'real', 'double precision', 'money'].includes(type)) {
    return 'number'
  }
  if (['timestamp', 'timestamptz', 'timestamp without time zone', 'timestamp with time zone',
       'date', 'time', 'timetz', 'time without time zone', 'time with time zone', 'interval'].includes(type)) {
    return 'date'
  }
  if (['bool', 'boolean'].includes(type)) {
    return 'boolean'
  }
  if (['json', 'jsonb'].includes(type)) {
    return 'json'
  }
  if (['geometry', 'geography', 'point', 'polygon', 'linestring'].includes(type)) {
    return 'geography'
  }
  if (type.startsWith('_') || type.endsWith('[]')) {
    return 'json'
  }
  return 'string'
}

function buildPool(config: PostgreSQLConfig): Pool {
  const sslConfig = config.ssl
    ? config.sslCert
      ? { rejectUnauthorized: true, ca: config.sslCert }
      : { rejectUnauthorized: false }
    : false

  return new Pool({
    host: config.host,
    port: config.port ?? 5432,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: sslConfig as boolean | object,
    connectionTimeoutMillis: config.connectionTimeoutMs ?? 10_000,
    query_timeout: config.queryTimeoutMs ?? 30_000,
    max: 3,
    idleTimeoutMillis: 10_000,
  })
}

export class PostgreSQLConnector extends BaseConnector {
  async test(config: ConnectorConfig): Promise<ConnectorTestResult> {
    const pgConfig = config as PostgreSQLConfig
    const start = Date.now()
    const pool = buildPool(pgConfig)

    try {
      const client: PoolClient = await pool.connect()
      try {
        const result: PgQueryResult = await client.query('SELECT 1 AS ping, COUNT(*) OVER() AS count')
        const latencyMs = Date.now() - start

        // Get approximate row count from information_schema
        const countResult = await client.query<{ count: string }>(
          `SELECT SUM(reltuples)::bigint AS count
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE c.relkind = 'r'
             AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')`,
        )
        const recordCount = parseInt(countResult.rows[0]?.count ?? '0', 10)

        // Get preview rows from first available table
        const tableResult = await client.query<{ table_name: string }>(
          `SELECT table_name
           FROM information_schema.tables
           WHERE table_schema = $1
             AND table_type = 'BASE TABLE'
           ORDER BY table_name
           LIMIT 1`,
          [pgConfig.schema ?? 'public'],
        )
        let previewRows: Record<string, unknown>[] = []
        if (tableResult.rows.length > 0) {
          const tableName = tableResult.rows[0].table_name
          const schema = pgConfig.schema ?? 'public'
          const preview = await client.query(
            `SELECT * FROM "${schema}"."${tableName}" LIMIT 5`,
          )
          previewRows = preview.rows
        }

        return { success: true, latencyMs, recordCount, previewRows }
      } finally {
        client.release()
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, latencyMs: Date.now() - start, error }
    } finally {
      await pool.end().catch(() => {})
    }
  }

  async introspect(config: ConnectorConfig): Promise<FieldDefinition[]> {
    const pgConfig = config as PostgreSQLConfig
    const schema = pgConfig.schema ?? 'public'
    const pool = buildPool(pgConfig)

    try {
      const client: PoolClient = await pool.connect()
      try {
        // Fetch all columns with type info and constraints
        const columnsResult = await client.query<{
          table_name: string
          column_name: string
          data_type: string
          udt_name: string
          is_nullable: string
          column_default: string | null
          is_primary_key: boolean
          is_foreign_key: boolean
          enum_values: string | null
          description: string | null
        }>(
          `WITH pk_cols AS (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
              AND tc.table_schema = $1
          ),
          fk_cols AS (
            SELECT kcu.table_name, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = $1
          ),
          enum_types AS (
            SELECT t.typname, string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS enum_values
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE n.nspname = $1
            GROUP BY t.typname
          )
          SELECT
            c.table_name,
            c.column_name,
            c.data_type,
            c.udt_name,
            c.is_nullable,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
            CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_foreign_key,
            et.enum_values,
            pd.description
          FROM information_schema.columns c
          LEFT JOIN pk_cols pk ON pk.table_name = c.table_name AND pk.column_name = c.column_name
          LEFT JOIN fk_cols fk ON fk.table_name = c.table_name AND fk.column_name = c.column_name
          LEFT JOIN enum_types et ON et.typname = c.udt_name
          LEFT JOIN pg_description pd
            ON pd.objoid = (quote_ident($1) || '.' || quote_ident(c.table_name))::regclass
            AND pd.objsubid = c.ordinal_position
          WHERE c.table_schema = $1
            AND c.table_name IN (
              SELECT table_name FROM information_schema.tables
              WHERE table_schema = $1 AND table_type = 'BASE TABLE'
            )
          ORDER BY c.table_name, c.ordinal_position`,
          [schema],
        )

        return columnsResult.rows.map((row) => {
          const rawType = row.data_type === 'USER-DEFINED' ? row.udt_name : row.data_type
          const fieldType = pgTypeToFieldType(rawType)

          const sensitivePatterns = /password|secret|token|key|credential|ssn|credit_card|cvv|pin/i
          const isSensitive = sensitivePatterns.test(row.column_name)

          const field: FieldDefinition = {
            name: `${row.table_name}.${row.column_name}`,
            displayName: row.column_name
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            type: fieldType,
            nullable: row.is_nullable === 'YES',
            isPrimaryKey: row.is_primary_key,
            isSensitive,
            description: row.description ?? undefined,
          }

          if (fieldType === 'enum' && row.enum_values) {
            field.enumValues = row.enum_values.split(',')
          }

          return field
        })
      } finally {
        client.release()
      }
    } finally {
      await pool.end().catch(() => {})
    }
  }

  async query(
    config: ConnectorConfig,
    sql: string,
    params: unknown[],
  ): Promise<QueryResult> {
    const pgConfig = config as PostgreSQLConfig
    const pool = buildPool(pgConfig)
    const start = Date.now()

    try {
      const client: PoolClient = await pool.connect()
      try {
        // Wrap the query to get total count
        const countSql = `SELECT COUNT(*) AS __total_count FROM (${sql}) AS __subquery`
        const [countResult, dataResult] = await Promise.all([
          client.query<{ __total_count: string }>(countSql, params),
          client.query(sql, params),
        ])

        const totalCount = parseInt(countResult.rows[0]?.__total_count ?? '0', 10)
        return {
          rows: dataResult.rows,
          totalCount,
          queryTimeMs: Date.now() - start,
        }
      } finally {
        client.release()
      }
    } finally {
      await pool.end().catch(() => {})
    }
  }

  async getDistinctValues(
    config: ConnectorConfig,
    field: string,
    search?: string,
  ): Promise<string[]> {
    const pgConfig = config as PostgreSQLConfig
    const pool = buildPool(pgConfig)
    const schema = pgConfig.schema ?? 'public'

    // field format: "table_name.column_name"
    const parts = field.split('.')
    if (parts.length < 2) {
      throw new Error(`Invalid field format: ${field}. Expected "table.column"`)
    }
    const tableName = parts.slice(0, -1).join('.')
    const columnName = parts[parts.length - 1]

    try {
      const client: PoolClient = await pool.connect()
      try {
        const params: unknown[] = []
        let whereClause = ''

        if (search) {
          params.push(`%${search}%`)
          whereClause = `WHERE "${columnName}"::text ILIKE $1`
        }

        const sql = `
          SELECT DISTINCT "${columnName}"::text AS val
          FROM "${schema}"."${tableName}"
          ${whereClause}
          WHERE "${columnName}" IS NOT NULL
          ORDER BY val
          LIMIT 100`

        const result = await client.query<{ val: string }>(sql, params)
        return result.rows.map((r) => r.val)
      } finally {
        client.release()
      }
    } finally {
      await pool.end().catch(() => {})
    }
  }
}

export const postgresqlConnector = new PostgreSQLConnector()
