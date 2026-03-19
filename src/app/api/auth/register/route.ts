import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import { redis } from '@/lib/redis'
import { checkRateLimit } from '@/lib/auth-utils'
import type { ApiResponse } from '@/types/insightsforge'

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain a number'),
  orgName: z.string().min(2).max(100),
  orgSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
})

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  // Rate limit: 5 registrations per IP per hour
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rateLimit = await checkRateLimit(redis, `register:${ip}`, 5, 3600)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many registration attempts. Please try again later.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    )
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]
    return NextResponse.json(
      { success: false, error: firstError?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const { name, email, password, orgName, orgSlug } = parsed.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingUser) {
    return NextResponse.json(
      { success: false, error: 'An account with this email already exists.' },
      { status: 409 },
    )
  }

  // Check if org slug is taken
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  })

  if (existingTenant) {
    return NextResponse.json(
      { success: false, error: 'This organization URL is already taken. Please choose another.' },
      { status: 409 },
    )
  }

  // Create user + tenant + membership in a transaction
  const passwordHash = await hashPassword(password)

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        isActive: true,
      },
    })

    const tenant = await tx.tenant.create({
      data: {
        name: orgName,
        slug: orgSlug,
        plan: 'starter',
        status: 'trial',
        trialEndsAt,
        maxUsers: 5,
        maxSources: 3,
        maxReports: 20,
        settings: {
          timezone: 'UTC',
          locale: 'en-US',
          dateFormat: 'MMM d, yyyy',
          theme: 'system',
          primaryColor: '#7c3aed',
          allowPublicDashboards: false,
          requireMfa: false,
          allowedDomains: [],
          dataRetentionDays: 365,
        },
      },
    })

    await tx.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'tenant_admin',
        inviteStatus: 'accepted',
        joinedAt: new Date(),
      },
    })

    await tx.ifAuditLog.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        action: 'tenant_created',
        metadata: { orgName, orgSlug, plan: 'starter' },
      },
    })

    return { user, tenant }
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
