import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types/insightsforge'
import type { Plan } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/announcements
 * Returns currently active announcements for the authenticated tenant/plan.
 * Filters out announcements the user has already dismissed.
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = req.headers.get('X-Tenant-ID')
  const now = new Date()

  // Get tenant plan for targeting
  const tenant = tenantId
    ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } })
    : null

  // Get announcements the user already dismissed
  const dismissals = await prisma.ifAnnouncementDismissal.findMany({
    where: { userId: session.user.id },
    select: { announcementId: true },
  })
  const dismissedIds = new Set(dismissals.map((d) => d.announcementId))

  const announcements = await prisma.ifAnnouncement.findMany({
    where: {
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { startsAt: 'desc' },
  })

  const plan = tenant?.plan as Plan | undefined

  const visible = announcements.filter((a) => {
    if (dismissedIds.has(a.id)) return false
    const targets = a.targetPlans as Plan[]
    if (targets.length > 0 && plan && !targets.includes(plan)) return false
    return true
  })

  return NextResponse.json({ success: true, data: visible })
}
