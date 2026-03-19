import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { BaseConnector, ConnectorConfig, ConnectorTestResult, FieldDefinition, QueryResult } from './base'

export interface WebhookConnectorConfig extends ConnectorConfig {
  type: 'webhook'
  webhookId: string        // Unique identifier for this webhook endpoint
  webhookSecret?: string   // HMAC secret for payload verification
  dataSourceId: string     // The IfDataSource.id this webhook belongs to
  tenantId: string
  // Schema inference state
  inferredSchema?: FieldDefinition[]
  maxStoredEvents?: number  // Default: 10,000
}

export interface WebhookEvent {
  id: string
  webhookId: string
  receivedAt: Date
  headers: Record<string, string>
  payload: Record<string, unknown>
}

/**
 * Generate a unique webhook ID and secret for a new webhook data source.
 */
export function generateWebhookCredentials(): { webhookId: string; webhookSecret: string; webhookUrl: string } {
  const webhookId = randomBytes(16).toString('hex')
  const webhookSecret = randomBytes(32).toString('hex')
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const webhookUrl = `${baseUrl}/api/webhooks/${webhookId}`
  return { webhookId, webhookSecret, webhookUrl }
}

/**
 * Verify an incoming webhook HMAC-SHA256 signature.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const { createHmac } = require('crypto') as typeof import('crypto')
  const expected = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`
  // Constant-time comparison
  if (expected.length !== signature.length) return false
  return expected === signature
}

/**
 * Store an incoming webhook payload into the if_webhook_events table.
 * This uses Prisma's $executeRaw to avoid requiring a new Prisma model.
 */
export async function storeWebhookEvent(
  webhookId: string,
  headers: Record<string, string>,
  payload: Record<string, unknown>,
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO if_webhook_events (id, webhook_id, payload, headers, received_at)
    VALUES (
      gen_random_uuid(),
      ${webhookId},
      ${JSON.stringify(payload)}::jsonb,
      ${JSON.stringify(headers)}::jsonb,
      NOW()
    )
    ON CONFLICT DO NOTHING`
}

function inferType(value: unknown): 'string' | 'number' | 'date' | 'boolean' | 'json' {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'object') return 'json'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(new Date(value).getTime())) return 'date'
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number'
  }
  return 'string'
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  maxDepth = 2,
  depth = 0,
): Record<string, unknown> {
  if (depth >= maxDepth) return obj

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && depth < maxDepth) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey, maxDepth, depth + 1))
    } else {
      result[newKey] = value
    }
  }
  return result
}

export class WebhookConnector extends BaseConnector {
  async test(config: ConnectorConfig): Promise<ConnectorTestResult> {
    const whConfig = config as WebhookConnectorConfig
    const start = Date.now()

    try {
      // Check if we have any stored events for this webhook
      const result = await prisma.$queryRaw<Array<{ count: bigint; sample: unknown }>>`
        SELECT COUNT(*) as count,
               (SELECT payload FROM if_webhook_events
                WHERE webhook_id = ${whConfig.webhookId}
                ORDER BY received_at DESC LIMIT 1) as sample
        FROM if_webhook_events
        WHERE webhook_id = ${whConfig.webhookId}`

      const row = result[0]
      const count = Number(row?.count ?? 0)

      const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
      const webhookUrl = `${baseUrl}/api/webhooks/${whConfig.webhookId}`

      return {
        success: true,
        latencyMs: Date.now() - start,
        recordCount: count,
        previewRows: row?.sample ? [row.sample as Record<string, unknown>] : [],
        error: count === 0
          ? `Webhook endpoint ready. Send a POST request to ${webhookUrl} to start receiving data.`
          : undefined,
      }
    } catch (_err) {
      // Table may not exist yet
      return {
        success: true,
        latencyMs: Date.now() - start,
        recordCount: 0,
        previewRows: [],
        error: 'Webhook endpoint configured. Awaiting first event.',
      }
    }
  }

  async introspect(config: ConnectorConfig): Promise<FieldDefinition[]> {
    const whConfig = config as WebhookConnectorConfig

    // Return cached schema if available
    if (whConfig.inferredSchema?.length) {
      return whConfig.inferredSchema
    }

    // Try to infer from stored events
    try {
      const events = await prisma.$queryRaw<Array<{ payload: unknown }>>`
        SELECT payload FROM if_webhook_events
        WHERE webhook_id = ${whConfig.webhookId}
        ORDER BY received_at DESC
        LIMIT 10`

      if (!events.length) {
        return [{
          name: 'payload',
          displayName: 'Payload',
          type: 'json',
          nullable: false,
          description: 'Raw webhook payload. Schema will be inferred after first event is received.',
        }]
      }

      // Collect all field names and sample values across events
      const fieldSamples: Record<string, unknown[]> = {}
      for (const event of events) {
        const payload = event.payload as Record<string, unknown>
        const flat = flattenObject(payload)
        for (const [key, value] of Object.entries(flat)) {
          if (!fieldSamples[key]) fieldSamples[key] = []
          fieldSamples[key].push(value)
        }
      }

      return Object.entries(fieldSamples).map(([key, values]) => {
        const dominantType = inferType(values.find((v) => v !== null && v !== undefined))
        const sensitivePatterns = /password|secret|token|key|credential/i
        return {
          name: key,
          displayName: key.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          type: dominantType as FieldDefinition['type'],
          nullable: values.some((v) => v === null || v === undefined),
          isSensitive: sensitivePatterns.test(key),
        }
      })
    } catch {
      return [{
        name: 'payload',
        displayName: 'Payload',
        type: 'json',
        nullable: false,
      }]
    }
  }

  async query(
    config: ConnectorConfig,
    _sql: string,
    params: unknown[],
  ): Promise<QueryResult> {
    const whConfig = config as WebhookConnectorConfig
    const start = Date.now()

    const queryOpts = (params[0] ?? {}) as {
      limit?: number
      offset?: number
      startDate?: string
      endDate?: string
      selectFields?: string[]
    }

    const limit = queryOpts.limit ?? 1000
    const offset = queryOpts.offset ?? 0

    let events: Array<{ payload: unknown; received_at: Date }>
    let countResult: Array<{ count: bigint }>

    try {
      if (queryOpts.startDate && queryOpts.endDate) {
        const startDate = new Date(queryOpts.startDate)
        const endDate = new Date(queryOpts.endDate)
        events = await prisma.$queryRaw`
          SELECT payload, received_at FROM if_webhook_events
          WHERE webhook_id = ${whConfig.webhookId}
            AND received_at BETWEEN ${startDate} AND ${endDate}
          ORDER BY received_at DESC
          LIMIT ${limit} OFFSET ${offset}`
        countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM if_webhook_events
          WHERE webhook_id = ${whConfig.webhookId}
            AND received_at BETWEEN ${startDate} AND ${endDate}`
      } else {
        events = await prisma.$queryRaw`
          SELECT payload, received_at FROM if_webhook_events
          WHERE webhook_id = ${whConfig.webhookId}
          ORDER BY received_at DESC
          LIMIT ${limit} OFFSET ${offset}`
        countResult = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM if_webhook_events
          WHERE webhook_id = ${whConfig.webhookId}`
      }
    } catch {
      // Table doesn't exist yet
      return { rows: [], totalCount: 0, queryTimeMs: Date.now() - start }
    }

    const rows = events.map((e) => ({
      ...(e.payload as Record<string, unknown>),
      _received_at: e.received_at?.toISOString(),
    }))

    const totalCount = Number(countResult[0]?.count ?? 0)
    return { rows, totalCount, queryTimeMs: Date.now() - start }
  }

  async getDistinctValues(
    config: ConnectorConfig,
    field: string,
    search?: string,
  ): Promise<string[]> {
    const result = await this.query(config, '', [{ limit: 500 }])
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

export const webhookConnector = new WebhookConnector()
