import { Readable } from 'stream'
import { BaseConnector, ConnectorConfig, ConnectorTestResult, FieldDefinition, QueryResult } from './base'

export interface CsvConnectorConfig extends ConnectorConfig {
  type: 'csv_upload'
  // S3 source
  s3Bucket?: string
  s3Key?: string
  s3Region?: string
  // Direct content (for testing/small files)
  csvContent?: string
  // File metadata
  fileName?: string
  delimiter?: string
  hasHeader?: boolean
  encoding?: 'utf8' | 'utf16le' | 'latin1'
  // Schema cache
  cachedSchema?: FieldDefinition[]
  cachedRows?: Record<string, unknown>[]
}

type CsvRow = Record<string, string>

function inferValueType(values: string[]): 'string' | 'number' | 'date' | 'boolean' {
  const nonEmpty = values.filter((v) => v !== '' && v !== null && v !== undefined)
  if (nonEmpty.length === 0) return 'string'

  const boolSet = new Set(['true', 'false', '1', '0', 'yes', 'no', 't', 'f'])
  if (nonEmpty.every((v) => boolSet.has(v.toLowerCase()))) return 'boolean'

  if (nonEmpty.every((v) => !isNaN(Number(v)) && v.trim() !== '')) return 'number'

  const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/
  const altDatePattern = /^\d{2}[\/\-]\d{2}[\/\-]\d{4}/
  if (nonEmpty.every((v) => datePattern.test(v) || altDatePattern.test(v))) {
    const allValid = nonEmpty.every((v) => !isNaN(new Date(v).getTime()))
    if (allValid) return 'date'
  }

  return 'string'
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCsvContent(
  content: string,
  delimiter = ',',
  hasHeader = true,
): { headers: string[]; rows: CsvRow[] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }

  let headers: string[]
  let dataLines: string[]

  if (hasHeader) {
    headers = parseDelimitedLine(lines[0], delimiter).map((h) =>
      h.replace(/^["']|["']$/g, '').trim(),
    )
    dataLines = lines.slice(1)
  } else {
    const firstRow = parseDelimitedLine(lines[0], delimiter)
    headers = firstRow.map((_, i) => `column_${i + 1}`)
    dataLines = lines
  }

  const rows: CsvRow[] = dataLines.map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    const row: CsvRow = {}
    headers.forEach((header, i) => {
      row[header] = values[i] ?? ''
    })
    return row
  })

  return { headers, rows }
}

async function loadFromS3(
  bucket: string,
  key: string,
  region: string,
): Promise<string> {
  const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({ region })
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await client.send(command)

  if (!response.Body) throw new Error('Empty S3 response')

  const chunks: Uint8Array[] = []
  const stream = response.Body as Readable
  for await (const chunk of stream) {
    chunks.push(chunk as Uint8Array)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function coerceRowValues(
  rows: CsvRow[],
  fields: FieldDefinition[],
): Record<string, unknown>[] {
  const typeMap = new Map(fields.map((f) => [f.name, f.type]))

  return rows.map((row) => {
    const coerced: Record<string, unknown> = {}
    for (const [key, rawVal] of Object.entries(row)) {
      const type = typeMap.get(key)
      const trimmed = rawVal?.trim() ?? ''

      if (trimmed === '') {
        coerced[key] = null
        continue
      }

      switch (type) {
        case 'number':
          coerced[key] = Number(trimmed)
          break
        case 'boolean':
          coerced[key] = ['true', '1', 'yes', 't'].includes(trimmed.toLowerCase())
          break
        case 'date':
          coerced[key] = new Date(trimmed).toISOString()
          break
        default:
          coerced[key] = trimmed
      }
    }
    return coerced
  })
}

function applyFilters(
  rows: Record<string, unknown>[],
  filters: Record<string, { op: string; value: unknown }>,
): Record<string, unknown>[] {
  return rows.filter((row) => {
    return Object.entries(filters).every(([field, { op, value }]) => {
      const cellVal = row[field]
      switch (op) {
        case 'eq': return cellVal === value
        case 'neq': return cellVal !== value
        case 'gt': return Number(cellVal) > Number(value)
        case 'gte': return Number(cellVal) >= Number(value)
        case 'lt': return Number(cellVal) < Number(value)
        case 'lte': return Number(cellVal) <= Number(value)
        case 'contains': return String(cellVal).toLowerCase().includes(String(value).toLowerCase())
        case 'is_null': return cellVal === null || cellVal === undefined
        case 'is_not_null': return cellVal !== null && cellVal !== undefined
        case 'in': return Array.isArray(value) && value.includes(cellVal)
        default: return true
      }
    })
  })
}

export class CsvConnector extends BaseConnector {
  private async loadAndParse(config: CsvConnectorConfig): Promise<{
    fields: FieldDefinition[]
    rows: Record<string, unknown>[]
  }> {
    // Return cached schema/rows if available
    if (config.cachedSchema && config.cachedRows) {
      return { fields: config.cachedSchema, rows: config.cachedRows }
    }

    let csvContent: string
    if (config.csvContent) {
      csvContent = config.csvContent
    } else if (config.s3Bucket && config.s3Key) {
      csvContent = await loadFromS3(
        config.s3Bucket,
        config.s3Key,
        config.s3Region ?? 'us-east-1',
      )
    } else {
      throw new Error('CsvConnector: must provide either csvContent or s3Bucket+s3Key')
    }

    const { headers, rows } = parseCsvContent(
      csvContent,
      config.delimiter ?? ',',
      config.hasHeader !== false,
    )

    // Infer types from sample values
    const fields: FieldDefinition[] = headers.map((header) => {
      const sampleValues = rows.slice(0, 200).map((r) => r[header] ?? '')
      const type = inferValueType(sampleValues)
      const sensitivePatterns = /password|secret|token|key|credential/i

      return {
        name: header,
        displayName: header
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        type,
        nullable: sampleValues.some((v) => v === '' || v === null),
        isSensitive: sensitivePatterns.test(header),
      }
    })

    const typedRows = coerceRowValues(rows, fields)
    return { fields, rows: typedRows }
  }

  async test(config: ConnectorConfig): Promise<ConnectorTestResult> {
    const csvConfig = config as CsvConnectorConfig
    const start = Date.now()

    try {
      const { fields, rows } = await this.loadAndParse(csvConfig)
      return {
        success: true,
        latencyMs: Date.now() - start,
        recordCount: rows.length,
        previewRows: rows.slice(0, 5),
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, latencyMs: Date.now() - start, error }
    }
  }

  async introspect(config: ConnectorConfig): Promise<FieldDefinition[]> {
    const csvConfig = config as CsvConnectorConfig
    const { fields } = await this.loadAndParse(csvConfig)
    return fields
  }

  async query(
    config: ConnectorConfig,
    _sql: string,
    params: unknown[],
  ): Promise<QueryResult> {
    const csvConfig = config as CsvConnectorConfig
    const start = Date.now()

    const { rows } = await this.loadAndParse(csvConfig)

    // params[0] = { filters?, limit?, offset?, orderBy?, orderDir? }
    const queryOpts = (params[0] ?? {}) as {
      filters?: Record<string, { op: string; value: unknown }>
      limit?: number
      offset?: number
      orderBy?: string
      orderDir?: 'asc' | 'desc'
      selectFields?: string[]
    }

    let result = [...rows]

    // Apply filters
    if (queryOpts.filters && Object.keys(queryOpts.filters).length > 0) {
      result = applyFilters(result, queryOpts.filters)
    }

    const totalCount = result.length

    // Apply sorting
    if (queryOpts.orderBy) {
      const dir = queryOpts.orderDir === 'desc' ? -1 : 1
      result.sort((a, b) => {
        const aVal = a[queryOpts.orderBy!]
        const bVal = b[queryOpts.orderBy!]
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return aVal.localeCompare(bVal) * dir
        }
        return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * dir
      })
    }

    // Apply pagination
    const offset = queryOpts.offset ?? 0
    const limit = queryOpts.limit ?? 1000
    result = result.slice(offset, offset + limit)

    // Select specific fields
    if (queryOpts.selectFields?.length) {
      result = result.map((row) => {
        const projected: Record<string, unknown> = {}
        for (const f of queryOpts.selectFields!) {
          projected[f] = row[f]
        }
        return projected
      })
    }

    return { rows: result, totalCount, queryTimeMs: Date.now() - start }
  }

  async getDistinctValues(
    config: ConnectorConfig,
    field: string,
    search?: string,
  ): Promise<string[]> {
    const { rows } = await this.loadAndParse(config as CsvConnectorConfig)
    const values = new Set<string>()

    for (const row of rows) {
      const val = row[field]
      if (val !== null && val !== undefined) {
        const strVal = String(val)
        if (!search || strVal.toLowerCase().includes(search.toLowerCase())) {
          values.add(strVal)
        }
      }
    }

    return Array.from(values).sort().slice(0, 100)
  }

  /**
   * Parse a CSV file from a Buffer (used during upload).
   * Returns the inferred schema and first N rows.
   */
  async parseBuffer(
    buffer: Buffer,
    options: { fileName?: string; delimiter?: string; hasHeader?: boolean } = {},
  ): Promise<{ fields: FieldDefinition[]; previewRows: Record<string, unknown>[]; totalRows: number }> {
    const content = buffer.toString('utf8')
    const config: CsvConnectorConfig = {
      type: 'csv_upload',
      csvContent: content,
      delimiter: options.delimiter ?? ',',
      hasHeader: options.hasHeader !== false,
      fileName: options.fileName,
    }

    const { fields, rows } = await this.loadAndParse(config)
    return {
      fields,
      previewRows: rows.slice(0, 10),
      totalRows: rows.length,
    }
  }
}

export const csvConnector = new CsvConnector()
