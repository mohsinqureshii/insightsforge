import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { generateInviteToken } from '@/lib/auth-utils'
import { checkTenantLimit } from '@/lib/tenant'
import { z } from 'zod'
import type { ApiResponse } from '@/types/insightsforge'

const inviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(['analytics_admin', 'builder', 'viewer', 'api_user']),
  name: z.string().max(100).optional(),
})

// POST /api/v1/users/invite - Invite a user to the tenant
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'USER_INVITE')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  // Check user limit
  const limit = await checkTenantLimit(tenantId, 'users')
  if (!limit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Your plan allows a maximum of ${limit.max} users. Please upgrade to invite more.`,
        code: 'LIMIT_EXCEEDED',
      },
      { status: 402 },
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = inviteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const { email, role } = parsed.data

  // Check if user already exists in this tenant
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingUser) {
    const existingMembership = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: { tenantId, userId: existingUser.id },
      },
    })

    if (existingMembership && existingMembership.inviteStatus === 'accepted') {
      return NextResponse.json(
        { success: false, error: 'This user is already a member of your organization' },
        { status: 409 },
      )
    }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  })

  const inviter = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  const { token, expires } = generateInviteToken()

  if (existingUser) {
    // Upsert membership for existing user
    await prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId, userId: existingUser.id } },
      create: {
        tenantId,
        userId: existingUser.id,
        role,
        inviteStatus: 'pending',
        inviteToken: token,
        inviteExpires: expires,
        invitedBy: session.user.id,
      },
      update: {
        role,
        inviteStatus: 'pending',
        inviteToken: token,
        inviteExpires: expires,
        invitedBy: session.user.id,
      },
    })
  } else {
    // Create a pending invite (user will complete registration)
    // For now we create a placeholder — in a full flow you'd send email with register link
    // The invite token allows one-click join after registration
    await prisma.tenantUser.create({
      data: {
        tenantId,
        // We'll create a ghost entry using a temp ID until user registers
        // In practice, store invites in a separate table or use a join token approach
        user: {
          create: {
            email,
            name: parsed.data.name,
            isActive: false, // inactive until they set password
          },
        },
        role,
        inviteStatus: 'pending',
        inviteToken: token,
        inviteExpires: expires,
        invitedBy: session.user.id,
      },
    })
  }

  // TODO: Send invite email via nodemailer
  // await sendInviteEmail({ to: email, inviterName: inviter?.name, tenantName: tenant?.name, token })

  await prisma.ifAuditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'user_invited',
      metadata: { email, role },
    },
  }).catch(() => null)

  return NextResponse.json({ success: true }, { status: 201 })
}
