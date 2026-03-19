import { BaseConnector, ConnectorConfig, ConnectorTestResult, FieldDefinition, QueryResult } from './base'

export type RestApiAuthType = 'none' | 'api_key' | 'bearer' | 'basic'

export interface RestApiConfig extends ConnectorConfig {
  type: 'rest_api'
  baseUrl: string
  authType: RestApiAuthType
  // api_key
  apiKeyHeader?: string
  apiKeyValue?: string
  // bearer
  bearerToken?: string
  // basic
  basicUsername?: string
  basicPassword?: string
  // pagination
  paginationType?: 'none' | 'offset' | 'cursor' | 'link_header' | 'page_number'
  paginationPageParam?: string       // e.g. "page"
  paginationOffsetParam?: string     // e.g. "offset"
  paginationLimitParam?: string      // e.g. "limit"
  paginationCursorParam?: string     // e.g. "cursor"
  paginationCursorPath?: string      // JSON path to next cursor in response
  pageSize?: number
  maxPages?: number
  // response path
  dataPath?: string   // JSON path to the array, e.g. "data.items"
  totalCountPath?: string  // JSON path to total count
  // headers
  extraHeaders?: Record<string, string>
  // test endpoint override
  testEndpoint?: string
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray
interface JsonObject { [key: string]: JsonValue }
type JsonArray = JsonValue[]

function buildHeaders(config: RestApiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...config.extraHeaders,
  }

  switch (config.authType) {
    case 'api_key':
      if (config.apiKeyHeader && config.apiKeyValue) {
        headers[config.apiKeyHeader] = config.apiKeyValue
      }
      break
    case 'bearer':
      if (config.bearerToken) {
        headers['Authorization'] = `Bearer ${config.bearerToken}`
      }
      break
    case 'basic':
      if (config.basicUsername && config.basicPassword) {
        const creds = Buffer.from(`${config.basicUsername}:${config.basicPassword}`).toString('base64')
        headers['Authorization'] = `Basic ${creds}`
      }
      break
  }

  return headers
}

function getValueAtPath(obj: JsonValue, path: string): JsonValue {
  if (!path) return obj
  const parts = path.split('.')
  let current: JsonValue = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object' || Array.isArray(current)) {
      return null
    }
    current = (current as JsonObject)[part] ?? null
  }
  return current
}

function inferFieldType(
  value: unknown,
): 'string' | 'number' | 'date' | 'boolean' | 'json' {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'object') return 'json'
  if (typeof value === 'string') {
    // Try to detect ISO dates
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?/.test(value)) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) return 'date'
    }
    // Numeric strings
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number'
    return 'string'
  }
  return 'string'
}

async function fetchPage(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<{ data: unknown; linkHeader: string | null; status: number }> {
  const response = await fetch(url, { headers, signal })
  const linkHeader = response.headers.get('Link')
  const data: unknown = await response.json()
  return { data, linkHeader, status: response.status }
}

function parseLinkHeader(linkHeader: string): { next?: string } {
  const links: Record<string, string> = {}
  const parts = linkHeader.split(',')
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match) {
      links[match[2]] = match[1]
    }
  }
  return links
}

export class RestApiConnector extends BaseConnector {
  async test(config: ConnectorConfig): Promise<ConnectorTestResult> {
    const apiConfig = config as RestApiConfig
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const testUrl = apiConfig.testEndpoint
        ? `${apiConfig.baseUrl.replace(/\/$/, '')}/${apiConfig.testEndpoint.replace(/^\//, '')}`
        : apiConfig.baseUrl
      const headers = buildHeaders(apiConfig)
      const { data, status } = await fetchPage(testUrl, headers, controller.signal)

      if (status >= 400) {
        return {
          success: false,
          latencyMs: Date.now() - start,
          error: `HTTP ${status}`,
        }
      }

      let rows: Record<string, unknown>[] = []
      if (apiConfig.dataPath) {
        const extracted = getValueAtPath(data as JsonValue, apiConfig.dataPath)
        rows = Array.isArray(extracted)
          ? (extracted as Record<string, unknown>[]).slice(0, 5)
          : []
      } else if (Array.isArray(data)) {
        rows = (data as Record<string, unknown>[]).slice(0, 5)
      } else {
        rows = [data as Record<string, unknown>]
      }

      return {
        success: true,
        latencyMs: Date.now() - start,
        recordCount: rows.length,
        previewRows: rows,
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      return { success: false, latencyMs: Date.now() - start, error }
    } finally {
      clearTimeout(timeout)
    }
  }

  async introspect(config: ConnectorConfig): Promise<FieldDefinition[]> {
    const apiConfig = config as RestApiConfig
    const testResult = await this.test(config)

    if (!testResult.success || !testResult.previewRows?.length) {
      throw new Error(
        `Cannot introspect: ${testResult.error ?? 'No data returned from API'}`,
      )
    }

    const sampleRow = testResult.previewRows[0]
    return this.inferFieldsFromObject(sampleRow, '')
  }

  private inferFieldsFromObject(
    obj: Record<string, unknown>,
    prefix: string,
  ): FieldDefinition[] {
    const fields: FieldDefinition[] = []
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}.${key}` : key
      const inferredType = inferFieldType(value)

      // Flatten one level of nested objects
      if (
        inferredType === 'json' &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        prefix === '' // only one level of nesting
      ) {
        fields.push(...this.inferFieldsFromObject(value as Record<string, unknown>, key))
        continue
      }

      const sensitivePatterns = /password|secret|token|key|credential|ssn|credit_card/i
      fields.push({
        name: fieldName,
        displayName: key
          .replace(/_/g, ' ')
          .replace(/([A-Z])/g, ' $1')
          .replace(/\b\w/g, (c) => c.toUpperCase())
          .trim(),
        type: inferredType as FieldDefinition['type'],
        nullable: value === null,
        isSensitive: sensitivePatterns.test(key),
      })
    }
    return fields
  }

  async query(
    config: ConnectorConfig,
    _sql: string,
    params: unknown[],
  ): Promise<QueryResult> {
    const apiConfig = config as RestApiConfig
    const start = Date.now()
    const headers = buildHeaders(apiConfig)
    const pageSize = apiConfig.pageSize ?? 100
    const maxPages = apiConfig.maxPages ?? 10

    // Parse query params from the params array
    // Convention: params[0] = { offset?, limit?, cursor?, filters?: Record<string, unknown> }
    const queryParams = (params[0] ?? {}) as {
      offset?: number
      limit?: number
      cursor?: string
      filters?: Record<string, unknown>
    }

    const allRows: Record<string, unknown>[] = []
    let totalCount = 0
    let currentPage = 0
    let nextCursor: string | undefined = queryParams.cursor
    let currentOffset = queryParams.offset ?? 0
    const requestedLimit = queryParams.limit ?? pageSize

    const paginationType = apiConfig.paginationType ?? 'none'

    while (currentPage < maxPages) {
      // Build URL with pagination params
      const url = new URL(apiConfig.baseUrl)

      // Apply any filters from query params
      if (queryParams.filters) {
        for (const [k, v] of Object.entries(queryParams.filters)) {
          url.searchParams.set(k, String(v))
        }
      }

      if (paginationType === 'offset') {
        const offsetParam = apiConfig.paginationOffsetParam ?? 'offset'
        const limitParam = apiConfig.paginationLimitParam ?? 'limit'
        url.searchParams.set(offsetParam, String(currentOffset))
        url.searchParams.set(limitParam, String(Math.min(pageSize, requestedLimit - allRows.length)))
      } else if (paginationType === 'page_number') {
        const pageParam = apiConfig.paginationPageParam ?? 'page'
        const limitParam = apiConfig.paginationLimitParam ?? 'per_page'
        url.searchParams.set(pageParam, String(currentPage + 1))
        url.searchParams.set(limitParam, String(pageSize))
      } else if (paginationType === 'cursor' && nextCursor) {
        const cursorParam = apiConfig.paginationCursorParam ?? 'cursor'
        url.searchParams.set(cursorParam, nextCursor)
        const limitParam = apiConfig.paginationLimitParam ?? 'limit'
        url.searchParams.set(limitParam, String(pageSize))
      }

      const { data, linkHeader } = await fetchPage(url.toString(), headers)

      // Extract rows from response
      let pageRows: Record<string, unknown>[]
      if (apiConfig.dataPath) {
        const extracted = getValueAtPath(data as JsonValue, apiConfig.dataPath)
        pageRows = Array.isArray(extracted) ? (extracted as Record<string, unknown>[]) : []
      } else if (Array.isArray(data)) {
        pageRows = data as Record<string, unknown>[]
      } else {
        pageRows = [data as Record<string, unknown>]
      }

      // Extract total count if available
      if (apiConfig.totalCountPath) {
        const countVal = getValueAtPath(data as JsonValue, apiConfig.totalCountPath)
        if (typeof countVal === 'number') totalCount = countVal
      }

      allRows.push(...pageRows)

      // Check pagination stopping conditions
      if (paginationType === 'none') break
      if (pageRows.length === 0) break
      if (allRows.length >= requestedLimit) break

      if (paginationType === 'link_header') {
        if (!linkHeader) break
        const links = parseLinkHeader(linkHeader)
        if (!links.next) break
        // Use next URL directly
        const nextResult = await fetchPage(links.next, headers)
        const nextRows: Record<string, unknown>[] = apiConfig.dataPath
          ? ((getValueAtPath(nextResult.data as JsonValue, apiConfig.dataPath) as Record<string, unknown>[]) ?? [])
          : Array.isArray(nextResult.data)
          ? (nextResult.data as Record<string, unknown>[])
          : []
        allRows.push(...nextRows)
        break // Simple: just get one more page via link header
      } else if (paginationType === 'cursor') {
        if (apiConfig.paginationCursorPath) {
          const cursor = getValueAtPath(data as JsonValue, apiConfig.paginationCursorPath)
          if (!cursor || typeof cursor !== 'string') break
          nextCursor = cursor
        } else {
          break
        }
      } else if (paginationType === 'offset') {
        currentOffset += pageRows.length
        if (pageRows.length < pageSize) break
      } else if (paginationType === 'page_number') {
        if (pageRows.length < pageSize) break
      }

      currentPage++
    }

    if (totalCount === 0) totalCount = allRows.length

    return {
      rows: allRows.slice(0, requestedLimit),
      totalCount,
      queryTimeMs: Date.now() - start,
    }
  }

  async getDistinctValues(
    config: ConnectorConfig,
    field: string,
    search?: string,
  ): Promise<string[]> {
    const result = await this.query(config, '', [{ limit: 1000 }])
    const values = new Set<string>()

    for (const row of result.rows) {
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
}

export const restApiConnector = new RestApiConnector()
