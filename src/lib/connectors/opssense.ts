/**
 * OpsSense pre-built connector
 *
 * OpsSense is a CMMS (Computerised Maintenance Management System) / facilities
 * management platform. This connector ships with a complete, pre-mapped field
 * catalogue for all 14 OpsSense modules so users only need to supply an API
 * key and base URL — no manual field mapping required.
 *
 * Auth: Bearer token (Authorization: Bearer <apiKey>)
 * All endpoints use offset/page-number pagination.
 */

import type { ConnectorTestResult, FieldDefinition, QueryResult } from './base'

// ============================================================
// Field catalogue types
// ============================================================

export type OpsSenseFieldType =
  | 'id'
  | 'datetime'
  | 'date'
  | 'text'
  | 'number'
  | 'boolean'
  | 'enum'

export interface OpsSenseFieldDefinition {
  apiName: string
  displayName: string
  type: OpsSenseFieldType
  enumValues?: string[]
}

export interface OpsSenseEndpoint {
  name: string
  entity: string
  path: string
  fields: OpsSenseFieldDefinition[]
}

// ============================================================
// Pre-mapped endpoint catalogue — 14 modules
// ============================================================

export const OPSSENSE_ENDPOINTS: OpsSenseEndpoint[] = [
  {
    name: 'Work Orders',
    entity: 'work_orders',
    path: '/api/v1/work-orders',
    fields: [
      { apiName: 'id', displayName: 'WO Number', type: 'id' },
      { apiName: 'created_at', displayName: 'Created At', type: 'datetime' },
      { apiName: 'completed_at', displayName: 'Completed At', type: 'datetime' },
      { apiName: 'title', displayName: 'Title', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['open', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'] },
      { apiName: 'priority', displayName: 'Priority', type: 'enum', enumValues: ['low', 'medium', 'high', 'emergency'] },
      { apiName: 'type', displayName: 'Type', type: 'enum', enumValues: ['corrective', 'preventive', 'inspection', 'project'] },
      { apiName: 'site_id', displayName: 'Site ID', type: 'id' },
      { apiName: 'site_name', displayName: 'Site Name', type: 'text' },
      { apiName: 'department', displayName: 'Department', type: 'text' },
      { apiName: 'assigned_to', displayName: 'Assigned Technician', type: 'text' },
      { apiName: 'sla_hours', displayName: 'SLA Hours', type: 'number' },
      { apiName: 'sla_breached', displayName: 'SLA Breached', type: 'boolean' },
      { apiName: 'resolution_time_hours', displayName: 'Resolution Time (hrs)', type: 'number' },
      { apiName: 'cost_usd', displayName: 'Cost (USD)', type: 'number' },
    ],
  },
  {
    name: 'Assets',
    entity: 'assets',
    path: '/api/v1/assets',
    fields: [
      { apiName: 'id', displayName: 'Asset ID', type: 'id' },
      { apiName: 'name', displayName: 'Asset Name', type: 'text' },
      { apiName: 'category', displayName: 'Category', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['active', 'inactive', 'maintenance', 'decommissioned'] },
      { apiName: 'health_score', displayName: 'Health Score', type: 'number' },
      { apiName: 'site_id', displayName: 'Site ID', type: 'id' },
      { apiName: 'last_maintenance_date', displayName: 'Last Maintenance', type: 'date' },
      { apiName: 'next_maintenance_date', displayName: 'Next Maintenance', type: 'date' },
      { apiName: 'age_years', displayName: 'Age (Years)', type: 'number' },
      { apiName: 'replacement_cost_usd', displayName: 'Replacement Cost', type: 'number' },
    ],
  },
  {
    name: 'Preventive Maintenance',
    entity: 'pm_schedules',
    path: '/api/v1/pm-schedules',
    fields: [
      { apiName: 'id', displayName: 'PM ID', type: 'id' },
      { apiName: 'asset_id', displayName: 'Asset ID', type: 'id' },
      { apiName: 'title', displayName: 'Title', type: 'text' },
      { apiName: 'frequency', displayName: 'Frequency', type: 'enum', enumValues: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] },
      { apiName: 'last_done', displayName: 'Last Done', type: 'date' },
      { apiName: 'next_due', displayName: 'Next Due', type: 'date' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['scheduled', 'overdue', 'completed', 'skipped'] },
      { apiName: 'technician', displayName: 'Technician', type: 'text' },
      { apiName: 'duration_hours', displayName: 'Duration (hrs)', type: 'number' },
    ],
  },
  {
    name: 'Incidents',
    entity: 'incidents',
    path: '/api/v1/incidents',
    fields: [
      { apiName: 'id', displayName: 'Incident ID', type: 'id' },
      { apiName: 'occurred_at', displayName: 'Occurred At', type: 'datetime' },
      { apiName: 'resolved_at', displayName: 'Resolved At', type: 'datetime' },
      { apiName: 'title', displayName: 'Title', type: 'text' },
      { apiName: 'severity', displayName: 'Severity', type: 'enum', enumValues: ['low', 'medium', 'high', 'critical'] },
      { apiName: 'category', displayName: 'Category', type: 'text' },
      { apiName: 'site_id', displayName: 'Site ID', type: 'id' },
      { apiName: 'affected_assets', displayName: 'Affected Assets Count', type: 'number' },
      { apiName: 'downtime_hours', displayName: 'Downtime (hrs)', type: 'number' },
      { apiName: 'root_cause', displayName: 'Root Cause', type: 'text' },
    ],
  },
  {
    name: 'Inspections',
    entity: 'inspections',
    path: '/api/v1/inspections',
    fields: [
      { apiName: 'id', displayName: 'Inspection ID', type: 'id' },
      { apiName: 'inspected_at', displayName: 'Inspected At', type: 'datetime' },
      { apiName: 'asset_id', displayName: 'Asset ID', type: 'id' },
      { apiName: 'inspector', displayName: 'Inspector', type: 'text' },
      { apiName: 'score', displayName: 'Score', type: 'number' },
      { apiName: 'passed', displayName: 'Passed', type: 'boolean' },
      { apiName: 'findings_count', displayName: 'Findings Count', type: 'number' },
      { apiName: 'category', displayName: 'Category', type: 'text' },
    ],
  },
  {
    name: 'Spare Parts',
    entity: 'spare_parts',
    path: '/api/v1/spare-parts',
    fields: [
      { apiName: 'id', displayName: 'Part ID', type: 'id' },
      { apiName: 'name', displayName: 'Part Name', type: 'text' },
      { apiName: 'sku', displayName: 'SKU', type: 'text' },
      { apiName: 'quantity_on_hand', displayName: 'Qty on Hand', type: 'number' },
      { apiName: 'reorder_point', displayName: 'Reorder Point', type: 'number' },
      { apiName: 'unit_cost_usd', displayName: 'Unit Cost (USD)', type: 'number' },
      { apiName: 'category', displayName: 'Category', type: 'text' },
      { apiName: 'supplier', displayName: 'Supplier', type: 'text' },
      { apiName: 'last_ordered_at', displayName: 'Last Ordered', type: 'date' },
    ],
  },
  {
    name: 'Purchase Orders',
    entity: 'purchase_orders',
    path: '/api/v1/purchase-orders',
    fields: [
      { apiName: 'id', displayName: 'PO Number', type: 'id' },
      { apiName: 'created_at', displayName: 'Created At', type: 'datetime' },
      { apiName: 'approved_at', displayName: 'Approved At', type: 'datetime' },
      { apiName: 'supplier', displayName: 'Supplier', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['draft', 'pending_approval', 'approved', 'ordered', 'received', 'cancelled'] },
      { apiName: 'total_usd', displayName: 'Total (USD)', type: 'number' },
      { apiName: 'line_items_count', displayName: 'Line Items', type: 'number' },
      { apiName: 'requested_by', displayName: 'Requested By', type: 'text' },
    ],
  },
  {
    name: 'Contractors',
    entity: 'contractors',
    path: '/api/v1/contractors',
    fields: [
      { apiName: 'id', displayName: 'Contractor ID', type: 'id' },
      { apiName: 'company_name', displayName: 'Company', type: 'text' },
      { apiName: 'category', displayName: 'Category', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['active', 'inactive', 'suspended'] },
      { apiName: 'rating', displayName: 'Rating', type: 'number' },
      { apiName: 'active_contracts', displayName: 'Active Contracts', type: 'number' },
      { apiName: 'ytd_spend_usd', displayName: 'YTD Spend (USD)', type: 'number' },
    ],
  },
  {
    name: 'Permits',
    entity: 'permits',
    path: '/api/v1/permits',
    fields: [
      { apiName: 'id', displayName: 'Permit ID', type: 'id' },
      { apiName: 'issued_at', displayName: 'Issued At', type: 'datetime' },
      { apiName: 'expires_at', displayName: 'Expires At', type: 'datetime' },
      { apiName: 'type', displayName: 'Permit Type', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['pending', 'active', 'expired', 'revoked'] },
      { apiName: 'issued_to', displayName: 'Issued To', type: 'text' },
      { apiName: 'location', displayName: 'Location', type: 'text' },
      { apiName: 'work_description', displayName: 'Work Description', type: 'text' },
    ],
  },
  {
    name: 'Safety Observations',
    entity: 'safety_observations',
    path: '/api/v1/safety/observations',
    fields: [
      { apiName: 'id', displayName: 'Observation ID', type: 'id' },
      { apiName: 'observed_at', displayName: 'Observed At', type: 'datetime' },
      { apiName: 'type', displayName: 'Type', type: 'enum', enumValues: ['unsafe_act', 'unsafe_condition', 'near_miss', 'positive'] },
      { apiName: 'severity', displayName: 'Severity', type: 'enum', enumValues: ['low', 'medium', 'high'] },
      { apiName: 'location', displayName: 'Location', type: 'text' },
      { apiName: 'reported_by', displayName: 'Reported By', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['open', 'actioned', 'closed'] },
    ],
  },
  {
    name: 'Energy Readings',
    entity: 'energy_readings',
    path: '/api/v1/energy/readings',
    fields: [
      { apiName: 'id', displayName: 'Reading ID', type: 'id' },
      { apiName: 'recorded_at', displayName: 'Recorded At', type: 'datetime' },
      { apiName: 'meter_id', displayName: 'Meter ID', type: 'id' },
      { apiName: 'zone', displayName: 'Zone', type: 'text' },
      { apiName: 'kwh', displayName: 'Energy (kWh)', type: 'number' },
      { apiName: 'cost_usd', displayName: 'Cost (USD)', type: 'number' },
      { apiName: 'peak', displayName: 'Peak Reading', type: 'boolean' },
    ],
  },
  {
    name: 'KPI Dashboard',
    entity: 'kpis',
    path: '/api/v1/kpis/summary',
    fields: [
      { apiName: 'metric', displayName: 'Metric', type: 'text' },
      { apiName: 'value', displayName: 'Value', type: 'number' },
      { apiName: 'target', displayName: 'Target', type: 'number' },
      { apiName: 'unit', displayName: 'Unit', type: 'text' },
      { apiName: 'period', displayName: 'Period', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['on_track', 'at_risk', 'off_track'] },
    ],
  },
  {
    name: 'Audit Trail',
    entity: 'audit_trail',
    path: '/api/v1/audit/trail',
    fields: [
      { apiName: 'id', displayName: 'Audit ID', type: 'id' },
      { apiName: 'timestamp', displayName: 'Timestamp', type: 'datetime' },
      { apiName: 'user', displayName: 'User', type: 'text' },
      { apiName: 'action', displayName: 'Action', type: 'text' },
      { apiName: 'resource_type', displayName: 'Resource Type', type: 'text' },
      { apiName: 'resource_id', displayName: 'Resource ID', type: 'id' },
      { apiName: 'details', displayName: 'Details', type: 'text' },
    ],
  },
  {
    name: 'Sites',
    entity: 'sites',
    path: '/api/v1/sites',
    fields: [
      { apiName: 'id', displayName: 'Site ID', type: 'id' },
      { apiName: 'name', displayName: 'Site Name', type: 'text' },
      { apiName: 'type', displayName: 'Site Type', type: 'text' },
      { apiName: 'status', displayName: 'Status', type: 'enum', enumValues: ['active', 'inactive', 'under_construction'] },
      { apiName: 'region', displayName: 'Region', type: 'text' },
      { apiName: 'area_sqm', displayName: 'Area (sqm)', type: 'number' },
      { apiName: 'open_wo_count', displayName: 'Open WOs', type: 'number' },
      { apiName: 'sla_compliance_pct', displayName: 'SLA Compliance %', type: 'number' },
    ],
  },
]

// ============================================================
// Config & connector class
// ============================================================

export interface OpsSenseConfig {
  baseUrl: string
  apiKey: string
}

/** Map OpsSense field types to the canonical FieldDefinition types used by InsightForge. */
function mapFieldType(t: OpsSenseFieldType): FieldDefinition['type'] {
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
    Authorization: `Bearer ${apiKey}`,
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
  if (!path) {
    return Array.isArray(body) ? (body as Record<string, unknown>[]) : []
  }
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

export class OpsSenseConnector {
  /**
   * Verify connectivity by calling GET /api/v1/health.
   * Falls back to probing /api/v1/sites if the health endpoint is absent.
   */
  async testConnection(config: OpsSenseConfig): Promise<ConnectorTestResult> {
    const start = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const url = `${normalizeBaseUrl(config.baseUrl)}/api/v1/health`
      const response = await fetch(url, {
        headers: buildHeaders(config.apiKey),
        signal: controller.signal,
      })

      const latencyMs = Date.now() - start

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          error: `HTTP ${response.status} from /api/v1/health`,
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
   * Return the pre-mapped field catalogue for every OpsSense module.
   * Each entry exposes the entity name together with its FieldDefinition array
   * so callers can build schema mappings without manual configuration.
   */
  getFieldCatalogue(): Array<{
    entity: string
    name: string
    fields: FieldDefinition[]
  }> {
    return OPSSENSE_ENDPOINTS.map((ep) => ({
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
   * Paginate through an OpsSense entity endpoint and return all rows.
   * Uses page-number pagination with a default page size of 100.
   * Filters are forwarded as query-string parameters on every request.
   */
  async fetchData(
    config: OpsSenseConfig,
    entity: string,
    filters?: Record<string, unknown>,
  ): Promise<QueryResult> {
    const start = Date.now()

    const endpoint = OPSSENSE_ENDPOINTS.find((ep) => ep.entity === entity)
    if (!endpoint) {
      throw new Error(
        `Unknown OpsSense entity: "${entity}". Valid entities: ${OPSSENSE_ENDPOINTS.map((e) => e.entity).join(', ')}`,
      )
    }

    const headers = buildHeaders(config.apiKey)
    const base = normalizeBaseUrl(config.baseUrl)
    const PAGE_SIZE = 100
    const MAX_PAGES = 50
    const allRows: Record<string, unknown>[] = []
    let page = 1

    while (page <= MAX_PAGES) {
      const url = new URL(`${base}${endpoint.path}`)
      url.searchParams.set('page', String(page))
      url.searchParams.set('per_page', String(PAGE_SIZE))

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
          `OpsSense API error on ${endpoint.path} (page ${page}): HTTP ${response.status}`,
        )
      }

      const body: unknown = await response.json()

      // OpsSense wraps paginated results in a "data" key by convention
      const pageRows = extractArray(body, 'data')
      allRows.push(...pageRows)

      // Stop when page is not full — no more records
      if (pageRows.length < PAGE_SIZE) break
      page++
    }

    return {
      rows: allRows,
      totalCount: allRows.length,
      queryTimeMs: Date.now() - start,
    }
  }
}

export const opsSenseConnector = new OpsSenseConnector()
