import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { ApiResponse } from '@/types/insightsforge'

export const ONBOARDING_STEPS = [
  'invite_team',
  'connect_data_source',
  'create_first_report',
  'create_first_dashboard',
  'schedule_report',
  'share_content',
] as const

type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]

const UpdateSchema = z.object({
  step: z.enum(ONBOARDING_STEPS),
  completed: z.boolean(),
})

const DismissSchema = z.object({ dismiss: z.literal(true) })

export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const tenantId = req.headers.get('X-Tenant-ID')
  if (!tenantId) return NextResponse.json({ success: false, error: 'Tenant context required' }, { status: 400 })

  let progress = await prisma.ifOnboardingProgress.findUnique({ where: { tenantId } })
  if (!progress) {
    // Auto-create on first access
    progress = await prisma.ifOnboardingProgress.create({
      data: { tenantId, steps: {} },
    })
  }

  const steps = progress.steps as Record<string, boolean>
  const completedSteps = ONBOARDING_STEPS.filter((s) => steps[s])
  const totalSteps = ONBOARDING_STEPS.length

  return NextResponse.json({
    success: true,
    data: {
      steps: Object.fromEntries(ONBOARDING_STEPS.map((s) => [s, steps[s] ?? false])),
      completedCount: completedSteps.length,
      totalSteps,
      percentComplete: Math.round((completedSteps.length / totalSteps) * 100),
      dismissed: progress.dismissed,
      completedAt: progress.completedAt,
    },
  })
}

export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const tenantId = req.headers.get('X-Tenant-ID')
  if (!tenantId) return NextResponse.json({ success: false, error: 'Tenant context required' }, { status: 400 })

  const body = await req.json().catch(() => null)

  // Check if it's a dismiss action
  const dismissParsed = DismissSchema.safeParse(body)
  if (dismissParsed.success) {
    const updated = await prisma.ifOnboardingProgress.upsert({
      where: { tenantId },
      create: { tenantId, steps: {}, dismissed: true },
      update: { dismissed: true },
    })
    return NextResponse.json({ success: true, data: updated })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 422 },
    )
  }

  const existing = await prisma.ifOnboardingProgress.findUnique({ where: { tenantId } })
  const currentSteps = (existing?.steps ?? {}) as Record<string, boolean>
  currentSteps[parsed.data.step] = parsed.data.completed

  const allComplete = ONBOARDING_STEPS.every((s) => currentSteps[s])

  const updated = await prisma.ifOnboardingProgress.upsert({
    where: { tenantId },
    create: { tenantId, steps: currentSteps, completedAt: allComplete ? new Date() : null },
    update: { steps: currentSteps, completedAt: allComplete ? new Date() : null },
  })

  return NextResponse.json({ success: true, data: updated })
}
