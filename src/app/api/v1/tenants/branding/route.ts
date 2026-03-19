import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { ApiResponse, TenantSettings } from '@/types/insightsforge'

type BrandingData = {
  logoUrl: string | null
  primaryColour: string | null
  fontFamily: string | null
  productNameOverride: string | null
  faviconUrl: string | null
}

const brandingUpdateSchema = z.object({
  logo_url: z.string().url('Must be a valid URL').optional().nullable(),
  primary_colour: z
    .string()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Must be a valid hex colour')
    .optional()
    .nullable(),
  font_family: z.string().max(100).optional().nullable(),
  product_name_override: z.string().max(100).optional().nullable(),
  favicon_url: z.string().url('Must be a valid URL').optional().nullable(),
})

// GET /api/v1/tenants/branding — returns branding settings from tenant settings JSONB
export async function GET(
  _req: NextRequest,
): Promise<NextResponse<ApiResponse<BrandingData>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId, deletedAt: null },
      select: { settings: true, logoUrl: true },
    })

    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    const settings = (tenant.settings ?? {}) as unknown as TenantSettings & {
      primaryColour?: string
      fontFamily?: string
      productNameOverride?: string
      faviconUrl?: string
    }

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: tenant.logoUrl ?? settings.logoUrl ?? null,
        primaryColour: settings.primaryColour ?? settings.primaryColor ?? null,
        fontFamily: settings.fontFamily ?? null,
        productNameOverride: settings.productNameOverride ?? null,
        faviconUrl: settings.faviconUrl ?? null,
      },
    })
  } catch (err) {
    console.error('[tenants/branding] GET error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to load branding settings' },
      { status: 500 },
    )
  }
}

// PUT /api/v1/tenants/branding — update branding settings. Tenant Admin only.
export async function PUT(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<BrandingData>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  if (session.activeRole !== 'tenant_admin' && session.activeRole !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = brandingUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const {
    logo_url,
    primary_colour,
    font_family,
    product_name_override,
    favicon_url,
  } = parsed.data

  try {
    const existing = await prisma.tenant.findUnique({
      where: { id: tenantId, deletedAt: null },
      select: { settings: true },
    })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 })
    }

    const currentSettings = (existing.settings ?? {}) as Record<string, unknown>

    // Merge branding fields into settings JSONB
    const updatedSettings = {
      ...currentSettings,
      ...(primary_colour !== undefined ? { primaryColour: primary_colour } : {}),
      ...(font_family !== undefined ? { fontFamily: font_family } : {}),
      ...(product_name_override !== undefined
        ? { productNameOverride: product_name_override }
        : {}),
      ...(favicon_url !== undefined ? { faviconUrl: favicon_url } : {}),
    } satisfies Record<string, unknown>

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings: updatedSettings as any,
        ...(logo_url !== undefined ? { logoUrl: logo_url } : {}),
        updatedAt: new Date(),
      },
      select: { settings: true, logoUrl: true },
    })

    const updatedSettingsResult = (updated.settings ?? {}) as Record<string, unknown>

    return NextResponse.json({
      success: true,
      data: {
        logoUrl: updated.logoUrl ?? null,
        primaryColour: (updatedSettingsResult.primaryColour as string) ?? null,
        fontFamily: (updatedSettingsResult.fontFamily as string) ?? null,
        productNameOverride: (updatedSettingsResult.productNameOverride as string) ?? null,
        faviconUrl: (updatedSettingsResult.faviconUrl as string) ?? null,
      },
    })
  } catch (err) {
    console.error('[tenants/branding] PUT error', err)
    return NextResponse.json(
      { success: false, error: 'Failed to update branding settings' },
      { status: 500 },
    )
  }
}
