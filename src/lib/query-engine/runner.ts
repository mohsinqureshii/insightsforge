// InsightForge – Query Execution Engine

import { getConnector } from '@/lib/connectors'
import type { ConnectorType } from '@/types/insightsforge'
import type {
  ReportDefinition,
  QueryResult,
  QueryResultColumn,
  FieldConfig,
  FilterConfig,
  SortConfig,
  FieldType,
  AggregationType,
} from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Derive a column alias from a FieldConfig. */
function fieldAlias(field: FieldConfig): string {
  if (field.aggregation) {
    return `${field.aggregation}_${field.columnName}`
  }
  return field.columnName
}

/** Quote an identifier safely (double-quote style, compatible with PG / BQ). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/** Map an aggregation enum to its SQL function name. */
function aggToSql(agg: AggregationType): string {
  const map: Record<AggregationType, string> = {
    sum: 'SUM',
    avg: 'AVG',
    count: 'COUNT',
    min: 'MIN',
    max: 'MAX',
    distinct_count: 'COUNT(DISTINCT {field})',
    median: 'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY {field})',
    stddev: 'STDDEV',
    variance: 'VARIANCE',
    first: 'FIRST_VALUE',
    last: 'LAST_VALUE',
  }
  return map[agg] ?? agg.toUpperCase()
}

/** Build the SQL expression for a single field column. */
function buildSelectExpr(
  field: FieldConfig,
  dialect: 'postgresql' | 'mysql' | 'bigquery',
): string {
  const tableRef = field.tableName ? `${quoteIdent(field.tableName)}.` : ''
  const colRef = `${tableRef}${quoteIdent(field.columnName)}`
  const alias = quoteIdent(fieldAlias(field))

  if (field.isCalculated && field.formula) {
    return `(${field.formula}) AS ${alias}`
  }

  if (!field.aggregation) {
    // Optional date truncation
    if (field.type === 'date' && field.dateGranularity) {
      if (dialect === 'postgresql') {
        return `DATE_TRUNC(${quoteIdent(field.dateGranularity)}, ${colRef}) AS ${alias}`
      }
      if (dialect === 'mysql') {
        const gran = field.dateGranularity.toUpperCase()
        return `DATE_FORMAT(${colRef}, '%Y-%m-%d') AS ${alias} /* ${gran} */`
      }
      if (dialect === 'bigquery') {
        return `DATE_TRUNC(${colRef}, ${field.dateGranularity.toUpperCase()}) AS ${alias}`
      }
    }
    return `${colRef} AS ${alias}`
  }

  const agg = field.aggregation
  if (agg === 'distinct_count') {
    return `COUNT(DISTINCT ${colRef}) AS ${alias}`
  }
  if (agg === 'median') {
    if (dialect === 'postgresql') {
      return `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${colRef}) AS ${alias}`
    }
    // Fallback for unsupported dialects
    return `AVG(${colRef}) AS ${alias} /* median approximation */`
  }
  if (agg === 'first') {
    if (dialect === 'postgresql') {
      return `(ARRAY_AGG(${colRef}))[1] AS ${alias}`
    }
    return `MIN(${colRef}) AS ${alias} /* first approximation */`
  }
  if (agg === 'last') {
    if (dialect === 'postgresql') {
      return `(ARRAY_AGG(${colRef} ORDER BY ${colRef} DESC))[1] AS ${alias}`
    }
    return `MAX(${colRef}) AS ${alias} /* last approximation */`
  }

  const sqlFn = aggToSql(agg)
  return `${sqlFn}(${colRef}) AS ${alias}`
}

/** Build a WHERE clause fragment for a single filter. */
function buildFilterClause(filter: FilterConfig): string {
  const tableRef = filter.tableName ? `${quoteIdent(filter.tableName)}.` : ''
  const colRef = `${tableRef}${quoteIdent(filter.field)}`

  const literal = (v: unknown): string => {
    if (v === null || v === undefined) return 'NULL'
    if (typeof v === 'number') return String(v)
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
    return `'${String(v).replace(/'/g, "''")}'`
  }

  switch (filter.operator) {
    case 'eq':
      return filter.value === null ? `${colRef} IS NULL` : `${colRef} = ${literal(filter.value)}`
    case 'neq':
      return filter.value === null
        ? `${colRef} IS NOT NULL`
        : `${colRef} != ${literal(filter.value)}`
    case 'gt':
      return `${colRef} > ${literal(filter.value)}`
    case 'gte':
      return `${colRef} >= ${literal(filter.value)}`
    case 'lt':
      return `${colRef} < ${literal(filter.value)}`
    case 'lte':
      return `${colRef} <= ${literal(filter.value)}`
    case 'contains':
      return `${colRef} ILIKE '%${String(filter.value).replace(/'/g, "''")}%'`
    case 'not_contains':
      return `${colRef} NOT ILIKE '%${String(filter.value).replace(/'/g, "''")}%'`
    case 'starts_with':
      return `${colRef} ILIKE '${String(filter.value).replace(/'/g, "''")}%'`
    case 'ends_with':
      return `${colRef} ILIKE '%${String(filter.value).replace(/'/g, "''")}'`
    case 'is_null':
      return `${colRef} IS NULL`
    case 'is_not_null':
      return `${colRef} IS NOT NULL`
    case 'in': {
      const vals = Array.isArray(filter.value) ? filter.value : [filter.value]
      return `${colRef} IN (${vals.map(literal).join(', ')})`
    }
    case 'not_in': {
      const vals = Array.isArray(filter.value) ? filter.value : [filter.value]
      return `${colRef} NOT IN (${vals.map(literal).join(', ')})`
    }
    case 'between':
      return `${colRef} BETWEEN ${literal(filter.value)} AND ${literal(filter.value2)}`
    default:
      return '1=1'
  }
}

// ---------------------------------------------------------------------------
// buildSqlFromDefinition
// ---------------------------------------------------------------------------

/**
 * Builds a SELECT query from a ReportDefinition.
 * Handles field aliasing, aggregations, WHERE clauses, GROUP BY, ORDER BY,
 * and LIMIT/OFFSET.
 */
export function buildSqlFromDefinition(
  def: ReportDefinition,
  dialect: 'postgresql' | 'mysql' | 'bigquery',
): string {
  if (def.customSql) {
    return def.customSql
  }

  const visibleFields = def.fields.filter((f) => f.visible !== false)

  if (visibleFields.length === 0) {
    throw new Error('ReportDefinition must have at least one visible field')
  }

  // SELECT
  const selectExprs = visibleFields.map((f) => buildSelectExpr(f, dialect))
  const selectClause = `SELECT\n  ${selectExprs.join(',\n  ')}`

  // FROM  – derive unique tables referenced
  const tables = Array.from(
    new Map(
      visibleFields
        .filter((f) => f.tableName)
        .map((f) => [f.tableName, f.tableName]),
    ).values(),
  )

  let fromClause = ''
  if (tables.length > 0) {
    fromClause = `FROM ${tables.map((t) => quoteIdent(t)).join(', ')}`
  }

  // JOIN clauses (if provided)
  const joinClauses: string[] = []
  if (def.joins && def.joins.length > 0) {
    for (const join of def.joins) {
      const joinTypeMap: Record<string, string> = {
        inner: 'INNER JOIN',
        left: 'LEFT JOIN',
        right: 'RIGHT JOIN',
        full: 'FULL OUTER JOIN',
      }
      const joinKeyword = joinTypeMap[join.joinType] ?? 'JOIN'
      const rightTable = quoteIdent(join.rightSourceId)
      const conditions = join.conditions
        .map(
          (c) =>
            `${quoteIdent(join.leftSourceId)}.${quoteIdent(c.leftField)} ${c.operator} ${rightTable}.${quoteIdent(c.rightField)}`,
        )
        .join(' AND ')
      joinClauses.push(`${joinKeyword} ${rightTable} ON ${conditions}`)
    }
  }

  // WHERE
  let whereClause = ''
  if (def.filters && def.filters.length > 0) {
    const parts: string[] = []
    for (let i = 0; i < def.filters.length; i++) {
      const filter = def.filters[i]
      if (!filter) continue
      const clause = buildFilterClause(filter)
      if (i === 0) {
        parts.push(clause)
      } else {
        const logic = filter.logicOperator ?? 'AND'
        parts.push(`${logic} ${clause}`)
      }
    }
    whereClause = `WHERE ${parts.join('\n  ')}`
  }

  // GROUP BY – include non-aggregate dimension fields when any aggregation exists
  const hasAggregation = visibleFields.some((f) => f.aggregation)
  let groupByClause = ''
  if (hasAggregation) {
    const dimensions = visibleFields.filter((f) => !f.aggregation && !f.isCalculated)
    if (dimensions.length > 0) {
      const groupExprs = dimensions.map((f) => {
        const tableRef = f.tableName ? `${quoteIdent(f.tableName)}.` : ''
        return `${tableRef}${quoteIdent(f.columnName)}`
      })
      groupByClause = `GROUP BY ${groupExprs.join(', ')}`
    }
  }

  // ORDER BY
  let orderByClause = ''
  if (def.sorts && def.sorts.length > 0) {
    const sorted = [...def.sorts].sort((a, b) => a.priority - b.priority)
    const orderExprs = sorted.map((s) => {
      // Try to find the field to get its alias
      const field = visibleFields.find((f) => f.id === s.fieldId)
      const ref = field ? quoteIdent(fieldAlias(field)) : quoteIdent(s.field)
      return `${ref} ${s.direction.toUpperCase()}`
    })
    orderByClause = `ORDER BY ${orderExprs.join(', ')}`
  }

  // LIMIT / OFFSET
  let limitClause = ''
  if (def.limit !== undefined && def.limit !== null) {
    limitClause = `LIMIT ${def.limit}`
    if (def.offset !== undefined && def.offset !== null && def.offset > 0) {
      limitClause += ` OFFSET ${def.offset}`
    }
  }

  const parts = [selectClause]
  if (fromClause) parts.push(fromClause)
  if (joinClauses.length > 0) parts.push(joinClauses.join('\n'))
  if (whereClause) parts.push(whereClause)
  if (groupByClause) parts.push(groupByClause)
  if (orderByClause) parts.push(orderByClause)
  if (limitClause) parts.push(limitClause)

  return parts.join('\n')
}

// ---------------------------------------------------------------------------
// Mock data generation
// ---------------------------------------------------------------------------

/** Generate plausible demo data based on field definitions. */
function generateMockData(
  fields: FieldConfig[],
  rowCount = 20,
): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = []

  const STRING_SAMPLES = [
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon',
    'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa',
    'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron',
    'Pi', 'Rho', 'Sigma', 'Tau', 'Upsilon',
  ]

  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, unknown> = {}
    for (const field of fields) {
      const alias = fieldAlias(field)
      switch (field.type) {
        case 'number':
          row[alias] = field.aggregation
            ? Math.round(Math.random() * 100_000) / 100
            : i + 1
          break
        case 'date':
          row[alias] = new Date(
            Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          ).toISOString()
          break
        case 'boolean':
          row[alias] = Math.random() > 0.5
          break
        default:
          row[alias] = STRING_SAMPLES[i % STRING_SAMPLES.length]
          break
      }
    }
    rows.push(row)
  }

  return rows
}

/** Build QueryResultColumn[] from the visible fields. */
function buildResultColumns(fields: FieldConfig[]): QueryResultColumn[] {
  return fields
    .filter((f) => f.visible !== false)
    .map((f) => ({
      id: f.id,
      label: f.label,
      type: f.type as FieldType,
      field: fieldAlias(f),
      aggregation: f.aggregation,
    }))
}

// ---------------------------------------------------------------------------
// executeReport
// ---------------------------------------------------------------------------

/**
 * Executes a report against the given data source configuration.
 *
 * Validates the ReportDefinition, fetches the appropriate connector,
 * executes the query, and returns a normalised QueryResult.
 * Falls back to mock demo data when the connector does not support queries
 * or when the data source config is unavailable.
 */
export async function executeReport(
  report: ReportDefinition,
  dataSource: { type: ConnectorType; credentials: Record<string, unknown> },
  params?: Record<string, unknown>,
): Promise<QueryResult> {
  const start = Date.now()

  // Basic validation
  if (!report.fields || report.fields.length === 0) {
    throw new Error('Report must have at least one field defined')
  }
  if (!report.dataSourceId) {
    throw new Error('Report must reference a data source')
  }

  const visibleFields = report.fields.filter((f) => f.visible !== false)
  const resultColumns = buildResultColumns(report.fields)

  // Apply parameter overrides to filters
  let effectiveReport = report
  if (params && report.parameters && report.parameters.length > 0) {
    const extraFilters: FilterConfig[] = report.parameters
      .filter((p) => params[p.name] !== undefined)
      .map((p) => ({
        id: `param_${p.name}`,
        fieldId: p.name,
        field: p.name,
        operator: 'eq' as const,
        value: params[p.name],
        type: p.type,
        logicOperator: 'AND' as const,
      }))

    effectiveReport = {
      ...report,
      filters: [...report.filters, ...extraFilters],
    }
  }

  // Attempt connector query
  const connector = getConnector(dataSource.type)

  if (connector) {
    try {
      // Determine dialect
      const dialectMap: Partial<Record<ConnectorType, 'postgresql' | 'mysql' | 'bigquery'>> = {
        postgresql: 'postgresql',
        mysql: 'mysql',
        mssql: 'postgresql', // closest approximation
        bigquery: 'bigquery',
        snowflake: 'postgresql',
        redshift: 'postgresql',
        clickhouse: 'postgresql',
        sqlite: 'postgresql',
      }
      const dialect = dialectMap[dataSource.type] ?? 'postgresql'

      const sql = buildSqlFromDefinition(effectiveReport, dialect)
      const config = { type: dataSource.type, ...dataSource.credentials }
      const connectorResult = await connector.query(config, sql, [])

      const queryTimeMs = Date.now() - start

      // Normalise rows to use field aliases as keys
      const rows = connectorResult.rows as Record<string, unknown>[]

      return {
        rows,
        columns: resultColumns,
        totalRows: connectorResult.totalCount,
        queryTimeMs,
        cached: false,
        truncated: rows.length < connectorResult.totalCount,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Surface query errors directly so callers can handle them
      throw new Error(`Query execution failed: ${message}`)
    }
  }

  // Connector not implemented – return mock demo data
  const mockRows = generateMockData(visibleFields, Math.min(report.limit ?? 50, 50))
  return {
    rows: mockRows,
    columns: resultColumns,
    totalRows: mockRows.length,
    queryTimeMs: Date.now() - start,
    cached: false,
    truncated: false,
  }
}
