import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/api-middleware'
import type { ApiResponse } from '@/types/insightsforge'

const MarkReadSchema = z.object({
  ids: z.array(z.string().cuid()).optional(), // if omitted, marks all
  status: z.enum(['read', 'dismissed']).default('read'),
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

  const { searchParams } = req.nextUrl
  const onlyUnread = searchParams.get('unread') === 'true'
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20', 10))

  const where = {
    tenantId,
    userId: session.user.id,
    ...(onlyUnread && { status: 'unread' as const }),
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.ifNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ifNotification.count({ where }),
    prisma.ifNotification.count({ where: { tenantId, userId: session.user.id, status: 'unread' } }),
  ])

  return NextResponse.json({ success: true, data: { notifications, total, unreadCount, page, limit } })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
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

  const body = await req.json().catch(() => null)
  const parsed = MarkReadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const where = {
    tenantId,
    userId: session.user.id,
    ...(parsed.data.ids?.length ? { id: { in: parsed.data.ids } } : {}),
  }

  const { count } = await prisma.ifNotification.updateMany({
    where,
    data: {
      status: parsed.data.status,
      readAt: parsed.data.status === 'read' ? new Date() : null,
    },
  })

  return NextResponse.json({ success: true, data: { updated: count } })
}
