import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/auth-utils'
import { TOTP, Secret } from 'otpauth'
import type { ApiResponse } from '@/types/insightsforge'

// POST /api/auth/mfa/verify - Verify MFA code during session
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { code } = body as { code?: string }

  if (!code || typeof code !== 'string') {
    return NextResponse.json(
      { success: false, error: 'Code is required' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, mfaSecret: true, mfaBackupCodes: true },
  })

  if (!user || !user.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json(
      { success: false, error: 'MFA not enabled for this account' },
      { status: 400 },
    )
  }

  const secretBase32 = decrypt(user.mfaSecret)

  // Try TOTP first
  if (/^\d{6}$/.test(code)) {
    const totp = new TOTP({
      issuer: 'InsightForge',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(secretBase32),
    })

    const delta = totp.validate({ token: code, window: 1 })
    if (delta !== null) {
      return NextResponse.json({ success: true })
    }
  }

  // Try backup codes
  if (user.mfaBackupCodes) {
    const backupCodes = JSON.parse(decrypt(user.mfaBackupCodes)) as string[]
    const normalizedCode = code.toUpperCase().replace(/\s/g, '')
    const codeIndex = backupCodes.indexOf(normalizedCode)

    if (codeIndex !== -1) {
      // Remove used backup code (one-time use)
      const updatedCodes = backupCodes.filter((_, i) => i !== codeIndex)

      const { encrypt } = await import('@/lib/auth-utils')
      await prisma.user.update({
        where: { id: session.user.id },
        data: { mfaBackupCodes: encrypt(JSON.stringify(updatedCodes)) },
      })

      return NextResponse.json({ success: true, data: undefined })
    }
  }

  return NextResponse.json(
    { success: false, error: 'Invalid code. Please try again.' },
    { status: 400 },
  )
}

// DELETE /api/auth/mfa/verify - Disable MFA (requires code verification)
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const { code } = body as { code?: string }

  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: 'Please provide a valid 6-digit code to disable MFA' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, mfaSecret: true },
  })

  if (!user?.mfaEnabled || !user.mfaSecret) {
    return NextResponse.json(
      { success: false, error: 'MFA not enabled' },
      { status: 400 },
    )
  }

  const secretBase32 = decrypt(user.mfaSecret)
  const totp = new TOTP({
    issuer: 'InsightForge',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  })

  const delta = totp.validate({ token: code, window: 1 })
  if (delta === null) {
    return NextResponse.json(
      { success: false, error: 'Invalid code' },
      { status: 400 },
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaBackupCodes: null },
  })

  await prisma.ifAuditLog.create({
    data: {
      userId: session.user.id,
      action: 'mfa_disabled',
      metadata: {},
    },
  }).catch(() => null)

  return NextResponse.json({ success: true })
}
