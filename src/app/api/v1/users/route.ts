import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { z } from 'zod'
import type { ApiResponse, PaginatedResponse, TenantUser } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  q: z.string().optional(),
})

const updateRoleSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['tenant_admin', 'analytics_admin', 'builder', 'viewer', 'api_user']),
})

// GET /api/v1/users - List tenant members
export async function GET(
  req: NextRequest,
): Promise<NextResponse<PaginatedResponse<TenantUser>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 401 },
    )
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 400 },
    )
  }

  try {
    await requirePermission(session.user.id, tenantId, 'USER_READ')
  } catch {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 403 },
    )
  }

  const { searchParams } = req.nextUrl
  const parsed = querySchema.parse({
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
    q: searchParams.get('q'),
  })

  const where = {
    tenantId,
    ...(parsed.q
      ? {
          user: {
            OR: [
              { name: { contains: parsed.q, mode: 'insensitive' as const } },
              { email: { contains: parsed.q, mode: 'insensitive' as const } },
            ],
          },
        }
      : {}),
  }

  const [total, members] = await Promise.all([
    prisma.tenantUser.count({ where }),
    prisma.tenantUser.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastLoginAt: true,
            mfaEnabled: true,
          },
        },
      },
      skip: (parsed.page - 1) * parsed.pageSize,
      take: parsed.pageSize,
      orderBy: { createdAt: 'asc' },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: members as unknown as TenantUser[],
    meta: {
      total,
      page: parsed.page,
      pageSize: parsed.pageSize,
      totalPages: Math.ceil(total / parsed.pageSize),
    },
  })
}

// PATCH /api/v1/users - Update a user's role
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'USER_ROLE_CHANGE')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = updateRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const { userId, role } = parsed.data

  // Cannot change your own role
  if (userId === session.user.id) {
    return NextResponse.json(
      { success: false, error: 'You cannot change your own role' },
      { status: 400 },
    )
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  })

  if (!membership) {
    return NextResponse.json({ success: false, error: 'User not found in this organization' }, { status: 404 })
  }

  await prisma.tenantUser.update({
    where: { tenantId_userId: { tenantId, userId } },
    data: { role },
  })

  await prisma.ifAuditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'role_changed',
      entityType: 'user',
      entityId: userId,
      metadata: { newRole: role, previousRole: membership.role },
    },
  }).catch(() => null)

  return NextResponse.json({ success: true })
}

// DELETE /api/v1/users - Remove a user from tenant
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'USER_REMOVE')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
  }

  if (userId === session.user.id) {
    return NextResponse.json(
      { success: false, error: 'You cannot remove yourself from the organization' },
      { status: 400 },
    )
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  })

  if (!membership) {
    return NextResponse.json(
      { success: false, error: 'User not found in this organization' },
      { status: 404 },
    )
  }

  await prisma.tenantUser.delete({
    where: { tenantId_userId: { tenantId, userId } },
  })

  await prisma.ifAuditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'user_removed',
      entityType: 'user',
      entityId: userId,
      metadata: {},
    },
  }).catch(() => null)

  return NextResponse.json({ success: true })
}
