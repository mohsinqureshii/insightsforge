/**
 * Column masking engine.
 *
 * Given a set of active IfDataPolicy records for a data source,
 * applies column-level masking/denial to query result rows.
 */

import { createHash } from 'crypto'
import type { MaskingStrategy } from '@prisma/client'

export interface ColumnPolicy {
  targetColumn: string
  policyType: 'column_mask' | 'column_deny'
  maskingStrategy: MaskingStrategy | null
  maskingParam: number | null
}

type Row = Record<string, unknown>

/**
 * Apply column policies to a single row.
 * Returns a new row object with masked/removed fields.
 */
export function applyColumnPolicies(row: Row, policies: ColumnPolicy[]): Row {
  const result = { ...row }

  for (const policy of policies) {
    const col = policy.targetColumn
    if (!(col in result)) continue

    if (policy.policyType === 'column_deny') {
      delete result[col]
      continue
    }

    if (policy.policyType === 'column_mask') {
      result[col] = maskValue(result[col], policy.maskingStrategy, policy.maskingParam)
    }
  }

  return result
}

/**
 * Apply column policies to an array of rows.
 */
export function applyColumnPoliciesToRows(rows: Row[], policies: ColumnPolicy[]): Row[] {
  if (policies.length === 0) return rows
  return rows.map((row) => applyColumnPolicies(row, policies))
}

function maskValue(value: unknown, strategy: MaskingStrategy | null, param: number | null): unknown {
  if (value === null || value === undefined) return value

  const str = String(value)

  switch (strategy) {
    case 'redact':
      return '[REDACTED]'
    case 'null_out':
      return null
    case 'hash':
      return createHash('sha256').update(str).digest('hex')
    case 'partial': {
      const reveal = param ?? 4
      if (str.length <= reveal) return '*'.repeat(str.length)
      return str.slice(0, reveal) + '*'.repeat(Math.max(0, str.length - reveal))
    }
    default:
      return '[REDACTED]'
  }
}
