// Centre3 pre-built connector — data centre management platform
// Auth: X-API-Key header
// All endpoints use offset/page-number pagination

import type { ConnectorTestResult, FieldDefinition, QueryResult } from './base'

// ============================================================
// Field catalogue
// ============================================================

export type Centre3FieldType = 'id' | 'datetime' | 'date' | 'text' | 'number' | 'boolean' | 'enum'

export interface Centre3FieldDefinition {
  apiName: string
  displayName: string
  type: Centre3FieldType
  enumValues?: string[]
}

export interface Centre3Endpoint {
  name: string
  entity: string
  path: string
  method: 'GET'
  pagination: {
    type: 'offset'
    pageParam: string
    sizeParam: string
    pageSize: number
  }
  responseArrayPath: string
  fields: Centre3FieldDefinition[]
}

export const CENTRE3_ENDPOINTS: Centre3Endpoint[] = [
  {
    name: 'Access Events',
    entity: 'access_events',
    path: '/v1/access-events',
    method: 'GET',
    pagination: { type: 'offset', pageParam: 'page', sizeParam: 'per_page', pageSize: 100 },
    responseArrayPath: 'data',
    fields: [
      { apiName: 'id', displayName: 'Event ID', type: 'id' },
      { apiName: 'timestamp', displayName: 'Event Time', type: 'datetime' },
      { apiName: 'person_name', displayName: 'Person Name', type: 'text' },
      { apiName: 'person_type', displayName: 'Person Type', type: 'enum', enumValues: ['employee', 'visitor', 'contractor', 'vendor'] },
      { apiName: 'location', displayName: 'Location', type: 'text' },
      { apiName: 'direction', displayName: 'Direction', type: 'enum', enumValues: ['entry', 'exit'] },
      { apiName: 'result', displayName: 'Result', type: 'enum', enumValues: ['granted', 'denied'] },
      { apiName: 'card_id', displayName: 'Card ID', type: 'id' },
    ],
  },
  {
    name: 'Power Metrics',
    entity: 'power_metrics',
    path: '/v1/power-metrics',
    method: 'GET',
    pagination: { type: 'offset', pageParam: 'page', sizeParam: 'per_page', pageSize: 100 },
    responseArrayPath: 'data',
    fields: [
      { apiName: 'id', displayName: 'Metric ID', type: 'id' },
      { apiName: 'timestamp', displayName: 'Recorded At', type: 'datetime' },
      { apiName: 'zone', displayName: 'Zone', type: 'text' },
      { apiName: 'rack_id', displayName: 'Rack ID', type: 'id' },
      { apiName: 'kw_draw', displayName: 'Power Draw (kW)', type: 'number' },
      { apiName: 'pue', displayName: 'PUE Ratio', type: 'number' },
      { apiName: 'temperature_c', displayName: 'Temperature (°C)', type: 'number' },
      { apiName: 'humidity_pct', displayName: 'Humidity (%)', type: 'number' },
    ],
  },
  {
    name: 'Support Tickets',
    entity: 'tickets',
    path: '/v1/tickets',
    method: 'GET',
    pagination: { type: 'offset', pageParam: 'page', sizeParam: 'per_page', pageSize: 100 },
    responseArrayPath: 'data',
    fields: [
      { apiName: 'id', displayName: 'Ticket ID', type: 'id' },
      { apiName: 'created_at', displayName: 'Created At', type: 'datetime' },
      { apiName: 'resolved_at', displayName: 'Resolved At', type: 'datetime' },
      { apiName: 'title', displayName: 'Title', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['open', 'in_progress', 'pending', 'resolved', 'closed'] },
      { apiName: 'priority', displayName: 'Priority', type: 'enum', enumValues: ['low', 'medium', 'high', 'critical'] },
      { apiName: 'category', displayName: 'Category', type: 'text' },
      { apiName: 'assigned_to', displayName: 'Assigned To', type: 'text' },
      { apiName: 'site_id', displayName: 'Site ID', type: 'id' },
      { apiName: 'sla_breached', displayName: 'SLA Breached', type: 'boolean' },
    ],
  },
  {
    name: 'Billing',
    entity: 'billing',
    path: '/v1/billing/invoices',
    method: 'GET',
    pagination: { type: 'offset', pageParam: 'page', sizeParam: 'per_page', pageSize: 50 },
    responseArrayPath: 'invoices',
    fields: [
      { apiName: 'id', displayName: 'Invoice ID', type: 'id' },
      { apiName: 'period_start', displayName: 'Period Start', type: 'date' },
      { apiName: 'period_end', displayName: 'Period End', type: 'date' },
      { apiName: 'amount_usd', displayName: 'Amount (USD)', type: 'number' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['draft', 'issued', 'paid', 'overdue'] },
      { apiName: 'customer_id', displayName: 'Customer ID', type: 'id' },
      { apiName: 'customer_name', displayName: 'Customer Name', type: 'text' },
    ],
  },
  {
    name: 'Visitors',
    entity: 'visitors',
    path: '/v1/visitors',
    method: 'GET',
    pagination: { type: 'offset', pageParam: 'page', sizeParam: 'per_page', pageSize: 100 },
    responseArrayPath: 'data',
    fields: [
      { apiName: 'id', displayName: 'Visit ID', type: 'id' },
      { apiName: 'visitor_name', displayName: 'Visitor Name', type: 'text' },
      { apiName: 'company', displayName: 'Company', type: 'text' },
      { apiName: 'check_in', displayName: 'Check In', type: 'datetime' },
      { apiName: 'check_out', displayName: 'Check Out', type: 'datetime' },
      { apiName: 'host_name', displayName: 'Host Name', type: 'text' },
      { apiName: 'purpose', displayName: 'Purpose', type: 'text' },
      { apiName: 'badge_id', displayName: 'Badge ID', type: 'id' },
    ],
  },
]

// ============================================================
// Config & connector class
// ============================================================

export interface Centre3Config {
  baseUrl: string
  apiKey: string
}

/** Map Centre3 field types to the canonical FieldDefinition types used by InsightForge. */
function mapFieldType(t: Centre3FieldType): FieldDefinition['type'] {
  switch (t) {
    case 'id':
      return 'string'
    case 'datetime':
    case 'date':
      return 'date'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'enum':
      return 'enum'
    case 'text':
    default:
      return 'string'
  }
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-Key': apiKey,
  }
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/$/, '')
}

/** Extract a nested array from a parsed JSON response using a dot-separated path. */
function extractArray(
  body: unknown,
  path: string,
): Record<string, unknown>[] {
  const parts = path.split('.')
  let node: unknown = body
  for (const part of parts) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      return []
    }
    node = (node as Record<string, unknown>)[part]
  }
  return Array.isArray(node) ? (node as Record<string, unknown>[]) : []
}

export class Centre3Connector {
  /** Verify connectivity by calling GET /v1/health. */
  async testConnection(config: Centre3Config): Promise<ConnectorTestResult> {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const url = `${normalizeBaseUrl(config.baseUrl)}/v1/health`
      const response = await fetch(url, {
        headers: buildHeaders(config.apiKey),
        signal: controller.signal,
      })

      const latencyMs = Date.now() - start

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          error: `HTTP ${response.status} from /v1/health`,
        }
      }

      return { success: true, latencyMs }
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Return the pre-mapped field catalogue for every Centre3 entity.
   * Each entry exposes the entity name together with its FieldDefinition array
   * so callers can build schema mappings without manual configuration.
   */
  getFieldCatalogue(): Array<{
    entity: string
    name: string
    fields: FieldDefinition[]
  }> {
    return CENTRE3_ENDPOINTS.map((ep) => ({
      entity: ep.entity,
      name: ep.name,
      fields: ep.fields.map((f) => ({
        name: f.apiName,
        displayName: f.displayName,
        type: mapFieldType(f.type),
        nullable: true,
        enumValues: f.enumValues,
      })),
    }))
  }

  /**
   * Paginate through a Centre3 entity endpoint and return all rows.
   * Filters are appended as query-string parameters on every request.
   */
  async fetchData(
    config: Centre3Config,
    entity: string,
    filters?: Record<string, unknown>,
  ): Promise<QueryResult> {
    const start = Date.now()

    const endpoint = CENTRE3_ENDPOINTS.find((ep) => ep.entity === entity)
    if (!endpoint) {
      throw new Error(`Unknown Centre3 entity: "${entity}"`)
    }

    const headers = buildHeaders(config.apiKey)
    const base = normalizeBaseUrl(config.baseUrl)
    const { pageParam, sizeParam, pageSize } = endpoint.pagination
    const allRows: Record<string, unknown>[] = []
    let page = 1

    while (true) {
      const url = new URL(`${base}${endpoint.path}`)
      url.searchParams.set(pageParam, String(page))
      url.searchParams.set(sizeParam, String(pageSize))

      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null) {
            url.searchParams.set(k, String(v))
          }
        }
      }

      const response = await fetch(url.toString(), { headers })

      if (!response.ok) {
        throw new Error(
          `Centre3 API error on ${endpoint.path} (page ${page}): HTTP ${response.status}`,
        )
      }

      const body: unknown = await response.json()
      const pageRows = extractArray(body, endpoint.responseArrayPath)
      allRows.push(...pageRows)

      // Stop when the page is not full — there are no more records
      if (pageRows.length < pageSize) break
      page++
    }

    return {
      rows: allRows,
      totalCount: allRows.length,
      queryTimeMs: Date.now() - start,
    }
  }
}

export const centre3Connector = new Centre3Connector()
