import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { ApiResponse } from '@/types/insightsforge'
import type { AlertCondition, AlertSeverity, NotificationChannel } from '@prisma/client'

const UpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  metricField: z.string().min(1).max(120).optional(),
  condition: z.enum([
    'greater_than', 'less_than', 'equals', 'not_equals',
    'percentage_change_up', 'percentage_change_down',
  ]).optional(),
  threshold: z.number().optional(),
  severity: z.enum(['info', 'warning', 'critical']).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'slack'])).optional(),
  slackWebhook: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const rule = await prisma.ifAlertRule.findUnique({
    where: { id },
    include: {
      firings: { orderBy: { firedAt: 'desc' }, take: 10 },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })
  if (!rule) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true, data: rule })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const existing = await prisma.ifAlertRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  const updated = await prisma.ifAlertRule.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.metricField !== undefined && { metricField: parsed.data.metricField }),
      ...(parsed.data.condition !== undefined && { condition: parsed.data.condition as AlertCondition }),
      ...(parsed.data.threshold !== undefined && { threshold: parsed.data.threshold }),
      ...(parsed.data.severity !== undefined && { severity: parsed.data.severity as AlertSeverity }),
      ...(parsed.data.channels !== undefined && { channels: parsed.data.channels as NotificationChannel[] }),
      ...(parsed.data.slackWebhook !== undefined && { slackWebhook: parsed.data.slackWebhook }),
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
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const existing = await prisma.ifAlertRule.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

  await prisma.ifAlertRule.delete({ where: { id } })
  return NextResponse.json({ success: true, data: null })
}
