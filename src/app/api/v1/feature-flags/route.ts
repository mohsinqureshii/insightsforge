import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/api-middleware'
import { invalidateFlagCache, getAllFlagsForTenant } from '@/lib/feature-flags'
import type { ApiResponse } from '@/types/insightsforge'
import type { FlagScope, Plan } from '@prisma/client'

const CreateFlagSchema = z.object({
  key: z.string().regex(/^[a-z0-9_]+$/).min(1).max(64),
  description: z.string().max(500).optional(),
  scope: z.enum(['global', 'tenant']).default('global'),
  enabledGlobally: z.boolean().default(false),
  enabledForPlans: z.array(z.enum(['starter', 'business', 'enterprise'])).default([]),
})

const SetOverrideSchema = z.object({
  tenantId: z.string().cuid(),
  enabled: z.boolean(),
})

/** GET /api/v1/feature-flags — tenant-resolved flag map */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'API')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = req.headers.get('X-Tenant-ID')
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant context required' }, { status: 400 })
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } })
  if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

  const flags = await getAllFlagsForTenant(tenantId, tenant.plan)
  return NextResponse.json({ success: true, data: flags })
}

/** POST /api/v1/feature-flags — super_admin: create a new flag */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'ADMIN')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  const role = (session?.user as unknown as { role?: string } | null)?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateFlagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const flag = await prisma.ifFeatureFlag.create({
    data: {
      key: parsed.data.key,
      description: parsed.data.description ?? null,
      scope: parsed.data.scope as FlagScope,
      enabledGlobally: parsed.data.enabledGlobally,
      enabledForPlans: parsed.data.enabledForPlans as Plan[],
      overrides: {},
    },
  })

  return NextResponse.json({ success: true, data: flag }, { status: 201 })
}

/** PATCH /api/v1/feature-flags?key=<key> — super_admin: set per-tenant override */
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'ADMIN')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  const role = (session?.user as unknown as { role?: string } | null)?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ success: false, error: 'key param required' }, { status: 400 })

  const body = await req.json().catch(() => null)
  const parsed = SetOverrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const flag = await prisma.ifFeatureFlag.findUnique({ where: { key } })
  if (!flag) return NextResponse.json({ success: false, error: 'Flag not found' }, { status: 404 })

  const overrides = { ...(flag.overrides as Record<string, boolean>), [parsed.data.tenantId]: parsed.data.enabled }
  const updated = await prisma.ifFeatureFlag.update({ where: { key }, data: { overrides } })

  await invalidateFlagCache(key)
  return NextResponse.json({ success: true, data: updated })
}
