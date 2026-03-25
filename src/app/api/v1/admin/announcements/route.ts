import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { applyRateLimit } from '@/lib/api-middleware'
import type { ApiResponse } from '@/types/insightsforge'
import type { AnnouncementType, Plan } from '@prisma/client'

export const dynamic = 'force-dynamic'

const CreateSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'feature', 'maintenance']).default('info'),
  ctaLabel: z.string().max(60).optional(),
  ctaUrl: z.string().url().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  targetPlans: z.array(z.enum(['starter', 'business', 'enterprise'])).default([]),
  isDismissible: z.boolean().default(true),
})

/** GET /api/v1/admin/announcements — super_admin list all */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'ADMIN')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  const role = (session?.user as unknown as { role?: string } | null)?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const announcements = await prisma.ifAnnouncement.findMany({
    orderBy: { startsAt: 'desc' },
    include: { _count: { select: { dismissals: true } } },
  })

  return NextResponse.json({ success: true, data: announcements })
}

/** POST /api/v1/admin/announcements — super_admin create */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const limited = await applyRateLimit(req, 'ADMIN')
  if (limited) return limited as NextResponse<ApiResponse<unknown>>

  const session = await getServerSession(authOptions)
  const role = (session?.user as unknown as { role?: string } | null)?.role
  if (role !== 'super_admin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const announcement = await prisma.ifAnnouncement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      type: parsed.data.type as AnnouncementType,
      ctaLabel: parsed.data.ctaLabel ?? null,
      ctaUrl: parsed.data.ctaUrl ?? null,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date(),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      targetPlans: parsed.data.targetPlans as Plan[],
      isDismissible: parsed.data.isDismissible,
    },
  })

  return NextResponse.json({ success: true, data: announcement }, { status: 201 })
}
