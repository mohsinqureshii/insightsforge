/**
 * Feature flag resolver.
 *
 * Resolves whether a feature flag is enabled for a given tenant + plan.
 * Results are cached in Redis for 60 seconds to avoid DB round-trips on
 * every request.
 */

import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, cacheDel } from '@/lib/redis'
import type { Plan } from '@prisma/client'

const TTL = 60 // seconds

function flagCacheKey(key: string): string {
  return `ff:${key}`
}

/** Check if a flag is enabled for the given tenant and plan. */
export async function isFlagEnabled(
  flagKey: string,
  tenantId: string,
  plan: Plan,
): Promise<boolean> {
  const cacheKey = flagCacheKey(flagKey)
  const cached = await cacheGet<{
    enabledGlobally: boolean
    enabledForPlans: string[]
    overrides: Record<string, boolean>
  }>(cacheKey)

  const flag = cached ?? (await loadFlag(flagKey, cacheKey))
  if (!flag) return false

  // Tenant-level override takes precedence
  if (tenantId in flag.overrides) {
    return flag.overrides[tenantId]
  }

  // Plan-level default
  if (flag.enabledForPlans.includes(plan)) return true

  return flag.enabledGlobally
}

async function loadFlag(
  flagKey: string,
  cacheKey: string,
): Promise<{ enabledGlobally: boolean; enabledForPlans: string[]; overrides: Record<string, boolean> } | null> {
  const flag = await prisma.ifFeatureFlag.findUnique({ where: { key: flagKey } })
  if (!flag) return null

  const data = {
    enabledGlobally: flag.enabledGlobally,
    enabledForPlans: flag.enabledForPlans as string[],
    overrides: flag.overrides as Record<string, boolean>,
  }

  await cacheSet(cacheKey, data, TTL)
  return data
}

/** Invalidate cached flag data (call after admin updates a flag). */
export async function invalidateFlagCache(flagKey: string): Promise<void> {
  await cacheDel(flagCacheKey(flagKey))
}

/** Get all flags with their resolved state for a tenant. */
export async function getAllFlagsForTenant(
  tenantId: string,
  plan: Plan,
): Promise<Record<string, boolean>> {
  const flags = await prisma.ifFeatureFlag.findMany()
  const result: Record<string, boolean> = {}

  for (const flag of flags) {
    const overrides = flag.overrides as Record<string, boolean>
    if (tenantId in overrides) {
      result[flag.key] = overrides[tenantId]
    } else if ((flag.enabledForPlans as string[]).includes(plan)) {
      result[flag.key] = true
    } else {
      result[flag.key] = flag.enabledGlobally
    }
  }

  return result
}
