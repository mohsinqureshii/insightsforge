import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { ApiResponse } from '@/types/insightsforge'
import type { AnnouncementType, Plan } from '@prisma/client'

const UpdateSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(1).max(2000).optional(),
  type: z.enum(['info', 'warning', 'feature', 'maintenance']).optional(),
  ctaLabel: z.string().max(60).nullable().optional(),
  ctaUrl: z.string().url().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  targetPlans: z.array(z.enum(['starter', 'business', 'enterprise'])).optional(),
  isDismissible: z.boolean().optional(),
})

function isSuperAdmin(session: Awaited<ReturnType<typeof getServerSession>>): boolean {
  return (session?.user as unknown as { role?: string } | null)?.role === 'super_admin'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.ifAnnouncement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const updated = await prisma.ifAnnouncement.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.body !== undefined && { body: parsed.data.body }),
      ...(parsed.data.type !== undefined && { type: parsed.data.type as AnnouncementType }),
      ...(parsed.data.ctaLabel !== undefined && { ctaLabel: parsed.data.ctaLabel }),
      ...(parsed.data.ctaUrl !== undefined && { ctaUrl: parsed.data.ctaUrl }),
      ...(parsed.data.endsAt !== undefined && { endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null }),
      ...(parsed.data.targetPlans !== undefined && { targetPlans: parsed.data.targetPlans as Plan[] }),
      ...(parsed.data.isDismissible !== undefined && { isDismissible: parsed.data.isDismissible }),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!isSuperAdmin(session)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const existing = await prisma.ifAnnouncement.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  await prisma.ifAnnouncement.delete({ where: { id } })
  return NextResponse.json({ success: true, data: null })
}
