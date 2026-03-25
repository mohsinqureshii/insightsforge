import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { checkTenantLimit, getDefaultTenantSettings } from '@/lib/tenant'
import { z } from 'zod'
import type { ApiResponse, TenantWithSettings } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  settings: z
    .object({
      timezone: z.string().optional(),
      locale: z.string().optional(),
      dateFormat: z.string().optional(),
      theme: z.enum(['light', 'dark', 'system']).optional(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      allowPublicDashboards: z.boolean().optional(),
      requireMfa: z.boolean().optional(),
      allowedDomains: z.array(z.string()).optional(),
      dataRetentionDays: z.number().min(30).max(3650).optional(),
    })
    .optional(),
})

// GET /api/v1/tenants - Get current tenant details
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<TenantWithSettings>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'No active organization. Please join or create an organization.' },
      { status: 400 },
    )
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SETTINGS_READ')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId, deletedAt: null },
  })

  if (!tenant) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
  }

  const data: TenantWithSettings = {
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
    settings: {
      ...getDefaultTenantSettings(),
      ...(tenant.settings as Record<string, unknown>),
    },
    trialEndsAt: tenant.trialEndsAt,
    createdAt: tenant.createdAt,
  }

  return NextResponse.json({ success: true, data })
}

// PATCH /api/v1/tenants - Update tenant settings
export async function PATCH(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<TenantWithSettings>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'SETTINGS_UPDATE')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = updateTenantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const { name, settings } = parsed.data

  const existing = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
  }

  const updatedSettings = {
    ...getDefaultTenantSettings(),
    ...(existing.settings as Record<string, unknown>),
    ...(settings ?? {}),
  }

  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(name ? { name } : {}),
      settings: updatedSettings,
    },
  })

  await prisma.ifAuditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'tenant_updated',
      metadata: { changes: parsed.data },
    },
  }).catch(() => null)

  const data: TenantWithSettings = {
    id: updatedTenant.id,
    name: updatedTenant.name,
    slug: updatedTenant.slug,
    plan: updatedTenant.plan,
    status: updatedTenant.status,
    logoUrl: updatedTenant.logoUrl,
    domain: updatedTenant.domain,
    maxUsers: updatedTenant.maxUsers,
    maxSources: updatedTenant.maxSources,
    maxReports: updatedTenant.maxReports,
    settings: updatedSettings,
    trialEndsAt: updatedTenant.trialEndsAt,
    createdAt: updatedTenant.createdAt,
  }

  return NextResponse.json({ success: true, data })
}
