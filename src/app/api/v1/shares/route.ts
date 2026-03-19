import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createHash } from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import type { ApiResponse, PaginatedResponse, Share } from '@/types/insightsforge'

const listQuerySchema = z.object({
  resourceType: z.enum(['report', 'dashboard']),
  resourceId: z.string().min(1),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

const createShareSchema = z.object({
  resourceType: z.enum(['report', 'dashboard']),
  resourceId: z.string().min(1),
  visibility: z.enum(['public', 'password', 'token']),
  password: z.string().min(6).max(100).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  allowedEmails: z.array(z.string().email()).optional(),
  allowDownload: z.boolean().optional().default(false),
})

// GET /api/v1/shares?resourceType=report&resourceId=xxx - List shares for a resource
export async function GET(
  req: NextRequest,
): Promise<NextResponse<PaginatedResponse<Share>>> {
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
    await requirePermission(session.user.id, tenantId, 'REPORT_SHARE')
  } catch {
    return NextResponse.json(
      { success: false, data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } },
      { status: 403 },
    )
  }

  const { searchParams } = req.nextUrl
  const parsed = listQuerySchema.safeParse({
    resourceType: searchParams.get('resourceType'),
    resourceId: searchParams.get('resourceId'),
    page: searchParams.get('page'),
    pageSize: searchParams.get('pageSize'),
  })

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
        error: parsed.error.issues[0]?.message ?? 'Invalid query parameters',
      },
      { status: 422 },
    )
  }

  const { resourceType, resourceId, page, pageSize } = parsed.data

  const where = {
    tenantId,
    ...(resourceType === 'report' ? { reportId: resourceId } : { dashboardId: resourceId }),
  }

  const [total, shares] = await Promise.all([
    prisma.ifShare.count({ where }),
    prisma.ifShare.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        tenantId: true,
        token: true,
        reportId: true,
        dashboardId: true,
        createdBy: true,
        expiresAt: true,
        viewCount: true,
        isActive: true,
        allowDownload: true,
        createdAt: true,
        // Exclude passwordHash
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: shares as unknown as Share[],
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

// POST /api/v1/shares - Create a share link
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<Share & { shareUrl: string }>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'REPORT_SHARE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createShareSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { resourceType, resourceId, visibility, password, expiresAt, allowDownload } = parsed.data

  // Validate the resource exists and belongs to this tenant
  if (resourceType === 'report') {
    const report = await prisma.ifReport.findFirst({
      where: { id: resourceId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
    }
  } else {
    const dashboard = await prisma.ifDashboard.findFirst({
      where: { id: resourceId, tenantId, deletedAt: null },
      select: { id: true },
    })
    if (!dashboard) {
      return NextResponse.json({ success: false, error: 'Dashboard not found' }, { status: 404 })
    }
  }

  // Generate unique share token
  const tokenSource = `${tenantId}-${resourceType}-${resourceId}-${Date.now()}-${Math.random()}`
  const shareToken = createHash('sha256').update(tokenSource).digest('hex').slice(0, 40)

  // Hash password if provided
  let passwordHash: string | undefined
  if (visibility === 'password' && password) {
    passwordHash = createHash('sha256').update(password).digest('hex')
  } else if (visibility === 'password' && !password) {
    return NextResponse.json(
      { success: false, error: 'A password is required for password-protected shares' },
      { status: 422 },
    )
  }

  const share = await prisma.ifShare.create({
    data: {
      tenantId,
      token: shareToken,
      ...(resourceType === 'report' ? { reportId: resourceId } : { dashboardId: resourceId }),
      createdBy: session.user.id,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      passwordHash: passwordHash ?? null,
      allowDownload: allowDownload ?? false,
      isActive: true,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'https://app.insightsforge.io'
  const shareUrl = `${baseUrl}/share/${shareToken}`

  return NextResponse.json(
    {
      success: true,
      data: {
        id: share.id,
        tenantId: share.tenantId,
        token: share.token,
        reportId: share.reportId,
        dashboardId: share.dashboardId,
        createdBy: share.createdBy,
        expiresAt: share.expiresAt,
        viewCount: share.viewCount,
        isActive: share.isActive,
        allowDownload: share.allowDownload,
        createdAt: share.createdAt,
        shareUrl,
      },
    },
    { status: 201 },
  )
}

// DELETE /api/v1/shares?token=xxx - Revoke a share by token
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'REPORT_SHARE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const token = req.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ success: false, error: 'token query parameter is required' }, { status: 400 })
  }

  const share = await prisma.ifShare.findFirst({
    where: { token, tenantId },
  })
  if (!share) {
    return NextResponse.json({ success: false, error: 'Share not found' }, { status: 404 })
  }

  await prisma.ifShare.update({
    where: { id: share.id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
