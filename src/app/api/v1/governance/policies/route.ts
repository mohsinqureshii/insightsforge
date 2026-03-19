import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/api-middleware'
import { requireRole, AuthorizationError } from '@/lib/rbac'
import type { ApiResponse } from '@/types/insightsforge'
import type { PolicyType, MaskingStrategy } from '@prisma/client'

const CreatePolicySchema = z.object({
  dataSourceId: z.string().cuid(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  policyType: z.enum(['row_filter', 'column_mask', 'column_deny']),
  targetColumn: z.string().max(120).optional(),
  filterExpr: z.string().max(1000).optional(),
  maskingStrategy: z.enum(['redact', 'partial', 'hash', 'null_out']).optional(),
  maskingParam: z.number().int().min(0).max(64).optional(),
  appliesToRoles: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
})

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

  try {
    await requireRole(session.user.id, tenantId, 'analytics_admin')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const dataSourceId = searchParams.get('dataSourceId')

  const policies = await prisma.ifDataPolicy.findMany({
    where: {
      tenantId,
      ...(dataSourceId ? { dataSourceId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { dataSource: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: policies })
}

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
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

  try {
    await requireRole(session.user.id, tenantId, 'analytics_admin')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreatePolicySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const { policyType } = parsed.data
  if (policyType === 'row_filter' && !parsed.data.filterExpr) {
    return NextResponse.json(
      { success: false, error: 'filterExpr is required for row_filter policies' },
      { status: 422 },
    )
  }
  if ((policyType === 'column_mask' || policyType === 'column_deny') && !parsed.data.targetColumn) {
    return NextResponse.json(
      { success: false, error: 'targetColumn is required for column policies' },
      { status: 422 },
    )
  }

  const policy = await prisma.ifDataPolicy.create({
    data: {
      tenantId,
      dataSourceId: parsed.data.dataSourceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      policyType: policyType as PolicyType,
      targetColumn: parsed.data.targetColumn ?? null,
      filterExpr: parsed.data.filterExpr ?? null,
      maskingStrategy: (parsed.data.maskingStrategy ?? null) as MaskingStrategy | null,
      maskingParam: parsed.data.maskingParam ?? null,
      appliesToRoles: parsed.data.appliesToRoles,
      isActive: parsed.data.isActive,
    },
  })

  return NextResponse.json({ success: true, data: policy }, { status: 201 })
}
