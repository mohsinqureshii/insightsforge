import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, buildCacheKey } from '@/lib/redis'
import type { TenantWithSettings, TenantSettings } from '@/types/insightsforge'

const TENANT_CACHE_TTL = 300 // 5 minutes

// ============================================================
// Tenant resolution
// ============================================================

/**
 * Resolve tenant from request context.
 * Priority: X-Tenant-ID header → subdomain → session
 */
export async function resolveTenant(
  tenantIdOrSlug?: string,
): Promise<TenantWithSettings | null> {
  if (!tenantIdOrSlug) return null

  const cacheKey = buildCacheKey('tenant', tenantIdOrSlug)
  const cached = await cacheGet<TenantWithSettings>(cacheKey)
  if (cached) return cached

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ id: tenantIdOrSlug }, { slug: tenantIdOrSlug }],
      deletedAt: null,
    },
  })

  if (!tenant) return null

  const result: TenantWithSettings = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    plan: tenant.plan,
    status: tenant.status,
    logoUrl: tenant.logoUrl,
    domain: tenant.domain,
    maxUsers: tenant.maxUsers,
    maxSources: tenant.maxSources,
    maxReports: tenant.maxReports,
    settings: (tenant.settings as TenantSettings) ?? getDefaultTenantSettings(),
    trialEndsAt: tenant.trialEndsAt,
    createdAt: tenant.createdAt,
  }

  await cacheSet(cacheKey, result, TENANT_CACHE_TTL)
  return result
}

/**
 * Resolve tenant from the Host header (subdomain routing).
 * e.g. acme.insightsforge.io → slug: acme
 */
export function extractTenantSlugFromHost(host: string): string | null {
  const appDomain = process.env.NEXTAUTH_URL
    ? new URL(process.env.NEXTAUTH_URL).hostname
    : 'insightsforge.io'

  // Strip port if present
  const hostWithoutPort = host.split(':')[0] ?? host

  if (!hostWithoutPort.endsWith(appDomain)) return null

  const subdomain = hostWithoutPort.slice(0, hostWithoutPort.length - appDomain.length - 1)
  if (!subdomain || subdomain === 'www' || subdomain === 'app') return null

  return subdomain
}

// ============================================================
// Tenant membership checks
// ============================================================

export async function getUserTenantRole(
  userId: string,
  tenantId: string,
): Promise<string | null> {
  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true, inviteStatus: true },
  })

  if (!membership || membership.inviteStatus !== 'accepted') return null
  return membership.role
}

export async function assertTenantMembership(
  userId: string,
  tenantId: string,
): Promise<void> {
  const role = await getUserTenantRole(userId, tenantId)
  if (!role) {
    throw new TenantAccessError('You are not a member of this organization')
  }
}

// ============================================================
// Tenant plan limits
// ============================================================

export async function checkTenantLimit(
  tenantId: string,
  resource: 'users' | 'sources' | 'reports',
): Promise<{ allowed: boolean; current: number; max: number }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      maxUsers: true,
      maxSources: true,
      maxReports: true,
      _count: {
        select: {
          tenantUsers: {
            where: { inviteStatus: 'accepted' },
          },
          dataSources: {
            where: { deletedAt: null, isActive: true },
          },
          reports: {
            where: { deletedAt: null },
          },
        },
      },
    },
  })

  if (!tenant) {
    return { allowed: false, current: 0, max: 0 }
  }

  const limits = {
    users: { current: tenant._count.tenantUsers, max: tenant.maxUsers },
    sources: { current: tenant._count.dataSources, max: tenant.maxSources },
    reports: { current: tenant._count.reports, max: tenant.maxReports },
  }

  const limit = limits[resource]
  return {
    allowed: limit.current < limit.max,
    current: limit.current,
    max: limit.max,
  }
}

// ============================================================
// Default settings
// ============================================================

export function getDefaultTenantSettings(): TenantSettings {
  return {
    timezone: 'UTC',
    locale: 'en-US',
    dateFormat: 'MMM d, yyyy',
    theme: 'system',
    primaryColor: '#7c3aed',
    allowPublicDashboards: false,
    requireMfa: false,
    allowedDomains: [],
    dataRetentionDays: 365,
  }
}

// ============================================================
// Errors
// ============================================================

export class TenantAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TenantAccessError'
  }
}

export class TenantLimitError extends Error {
  constructor(
    message: string,
    public resource: string,
    public current: number,
    public max: number,
  ) {
    super(message)
    this.name = 'TenantLimitError'
  }
}
