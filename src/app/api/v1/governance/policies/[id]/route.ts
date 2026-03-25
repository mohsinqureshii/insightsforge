import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { requireRole, AuthorizationError } from '@/lib/rbac'
import type { ApiResponse } from '@/types/insightsforge'
import type { MaskingStrategy } from '@prisma/client'

export const dynamic = 'force-dynamic'

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  filterExpr: z.string().max(1000).nullable().optional(),
  maskingStrategy: z.enum(['redact', 'partial', 'hash', 'null_out']).nullable().optional(),
  maskingParam: z.number().int().min(0).max(64).nullable().optional(),
  appliesToRoles: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const policy = await prisma.ifDataPolicy.findUnique({
    where: { id },
    include: { dataSource: { select: { id: true, name: true } } },
  })
  if (!policy) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: policy })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.ifDataPolicy.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  try { await requireRole(session.user.id, existing.tenantId, 'analytics_admin') }
  catch { return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 }) }

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const updated = await prisma.ifDataPolicy.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.filterExpr !== undefined && { filterExpr: parsed.data.filterExpr }),
      ...(parsed.data.maskingStrategy !== undefined && { maskingStrategy: parsed.data.maskingStrategy as MaskingStrategy | null }),
      ...(parsed.data.maskingParam !== undefined && { maskingParam: parsed.data.maskingParam }),
      ...(parsed.data.appliesToRoles !== undefined && { appliesToRoles: parsed.data.appliesToRoles }),
      ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await prisma.ifDataPolicy.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  try { await requireRole(session.user.id, existing.tenantId, 'analytics_admin') }
  catch { return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 }) }

  await prisma.ifDataPolicy.delete({ where: { id } })
  return NextResponse.json({ success: true, data: null })
}
