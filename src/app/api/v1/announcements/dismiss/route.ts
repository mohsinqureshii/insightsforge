import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { ApiResponse } from '@/types/insightsforge'

const DismissSchema = z.object({
  announcementId: z.string().cuid(),
})

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = req.headers.get('X-Tenant-ID') ?? ''
  const body = await req.json().catch(() => null)
  const parsed = DismissSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'announcementId required' }, { status: 422 })
  }

  await prisma.ifAnnouncementDismissal.upsert({
    where: { announcementId_userId: { announcementId: parsed.data.announcementId, userId: session.user.id } },
    create: {
      announcementId: parsed.data.announcementId,
      userId: session.user.id,
      tenantId,
    },
    update: { dismissedAt: new Date() },
  })

  return NextResponse.json({ success: true, data: null })
}
