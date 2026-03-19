/**
 * Cache helpers with named TTL presets.
 *
 * Re-exports the low-level helpers from redis.ts and adds
 * domain-specific TTL constants and typed wrappers.
 */

import { cacheGet, cacheSet } from '@/lib/redis'

export {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
  buildCacheKey,
} from '@/lib/redis'

// ---------------------------------------------------------------------------
// TTL presets (seconds)
// ---------------------------------------------------------------------------

export const CACHE_TTL = {
  /** Short-lived data: session-adjacent, security-sensitive */
  SHORT: 60,
  /** Standard app data (reports list, dashboard widgets) */
  DEFAULT: 300,
  /** Expensive aggregations that change infrequently */
  LONG: 1800,
  /** Static reference data (connector schemas, system templates) */
  STATIC: 86400,
} as const

// ---------------------------------------------------------------------------
// Cache key namespaces
// ---------------------------------------------------------------------------

export const CacheKeys = {
  tenantStats: (tenantId: string) => `tenant:${tenantId}:stats`,
  reportData: (reportId: string) => `report:${reportId}:data`,
  dashboardData: (dashboardId: string) => `dashboard:${dashboardId}:data`,
  connectorSchema: (connectorId: string) => `connector:${connectorId}:schema`,
  userPermissions: (userId: string, tenantId: string) =>
    `perms:${tenantId}:${userId}`,
  systemTemplates: () => 'system:templates',
  platformStats: () => 'admin:platform:stats',
  tenantUsage: (tenantId: string, period: string) =>
    `usage:${tenantId}:${period}`,
} as const

// ---------------------------------------------------------------------------
// Typed cache wrapper with automatic JSON serialisation
// ---------------------------------------------------------------------------

/**
 * Fetch from cache or compute via `fn`, then store result.
 *
 * @example
 *   const stats = await cachedFetch(
 *     CacheKeys.tenantStats(tenantId),
 *     CACHE_TTL.DEFAULT,
 *     () => computeExpensiveStats(tenantId),
 *   )
 */
export async function cachedFetch<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const fresh = await fn()
  await cacheSet(key, fresh, ttlSeconds)
  return fresh
}
