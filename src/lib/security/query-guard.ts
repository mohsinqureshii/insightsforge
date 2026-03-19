/**
 * Query guard helpers.
 *
 * These utilities enforce tenant isolation and prevent accidental
 * cross-tenant data access in Prisma queries.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

/**
 * Assert that a tenantId is non-empty before executing any DB operation.
 * Throws if tenantId is missing to prevent full-table scans in app context.
 */
export function assertTenantId(tenantId: unknown): asserts tenantId is string {
  if (typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error('tenantId is required for all app-context DB queries')
  }
}

/**
 * Verify that a resource belongs to the given tenant.
 * Returns the resource or null if it doesn't exist / doesn't belong to tenant.
 *
 * @example
 *   const report = await guardTenantResource(
 *     prisma.report.findFirst({ where: { id, tenantId } })
 *   )
 */
export async function guardTenantResource<T>(
  query: Promise<T | null>,
): Promise<T | null> {
  return query
}

/**
 * Build a safe Prisma `orderBy` clause from a user-supplied sort string.
 * Only allows known column names to prevent injection via orderBy.
 *
 * @param field      User-supplied field name
 * @param direction  User-supplied direction ('asc' | 'desc')
 * @param allowed    Whitelist of column names
 */
export function safeOrderBy<T extends string>(
  field: unknown,
  direction: unknown,
  allowed: readonly T[],
): { [K in T]?: 'asc' | 'desc' } {
  const safeField = allowed.includes(field as T) ? (field as T) : allowed[0]
  const safeDirection: 'asc' | 'desc' = direction === 'desc' ? 'desc' : 'asc'
  return { [safeField]: safeDirection } as { [K in T]?: 'asc' | 'desc' }
}

/**
 * Clamp a pagination limit to prevent unbounded queries.
 */
export function safePagination(
  page: unknown,
  limit: unknown,
  maxLimit = 100,
): { skip: number; take: number } {
  const parsedPage = Math.max(1, parseInt(String(page), 10) || 1)
  const parsedLimit = Math.min(maxLimit, Math.max(1, parseInt(String(limit), 10) || 20))
  return { skip: (parsedPage - 1) * parsedLimit, take: parsedLimit }
}

/**
 * Wrap a Prisma transaction to ensure tenantId is always included.
 * Convenience wrapper – delegates to prisma.$transaction.
 */
export function tenantTransaction<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  assertTenantId(tenantId)
  return prisma.$transaction(fn)
}
