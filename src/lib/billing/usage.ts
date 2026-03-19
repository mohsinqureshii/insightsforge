import { redis } from '@/lib/redis'

type UsageMetric = 'query' | 'export' | 'delivery'

/**
 * Increment a usage counter for a tenant.
 * Key format: billing:usage:{tenantId}:{metric}:{YYYY-MM}
 * At month boundary the snapshot should be moved to DB.
 */
export async function incrementUsageCounter(
  tenantId: string,
  metric: UsageMetric,
): Promise<void> {
  try {
    const now = new Date()
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const key = `billing:usage:${tenantId}:${metric}:${month}`
    await redis.incr(key)
    // Set expiry to ~35 days so old months are cleaned up automatically
    await redis.expire(key, 35 * 24 * 60 * 60)
  } catch {
    // Usage tracking failures are non-fatal
  }
}

/**
 * Get the current month usage for a tenant and metric.
 */
export async function getUsageCounter(
  tenantId: string,
  metric: UsageMetric,
): Promise<number> {
  try {
    const now = new Date()
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const key = `billing:usage:${tenantId}:${metric}:${month}`
    const value = await redis.get(key)
    return value ? parseInt(value, 10) : 0
  } catch {
    return 0
  }
}

/**
 * Get all usage counters for a tenant for the current month.
 */
export async function getTenantUsage(
  tenantId: string,
): Promise<Record<UsageMetric, number>> {
  const [query, exportCount, delivery] = await Promise.all([
    getUsageCounter(tenantId, 'query'),
    getUsageCounter(tenantId, 'export'),
    getUsageCounter(tenantId, 'delivery'),
  ])
  return { query, export: exportCount, delivery }
}
