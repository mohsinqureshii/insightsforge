import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { encrypt, generateBackupCodes } from '@/lib/auth-utils'
import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'
import type { ApiResponse } from '@/types/insightsforge'

interface MfaSetupData {
  secret: string
  qrCodeDataUrl: string
  manualEntryKey: string
  backupCodes: string[]
}

// GET /api/auth/mfa/setup - Generate TOTP secret and QR code
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<MfaSetupData>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, mfaEnabled: true },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  if (user.mfaEnabled) {
    return NextResponse.json(
      { success: false, error: 'MFA is already enabled' },
      { status: 409 },
    )
  }

  // Generate new TOTP secret
  const secret = new Secret({ size: 20 })
  const totp = new TOTP({
    issuer: 'InsightForge',
    label: user.email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  })

  const manualEntryKey = secret.base32
  const otpauthUrl = totp.toString()

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 256,
    margin: 2,
    color: { dark: '#1e1b4b', light: '#ffffff' },
  })

  // Store temporary secret in user record (not yet activated)
  const encryptedSecret = encrypt(manualEntryKey)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaSecret: encryptedSecret },
  })

  const backupCodes = generateBackupCodes(8)

  // Encrypt and store backup codes temporarily (confirmed on POST)
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes))
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaBackupCodes: encryptedBackupCodes },
  })

  return NextResponse.json({
    success: true,
    data: {
      secret: manualEntryKey,
      qrCodeDataUrl,
      manualEntryKey,
      backupCodes,
    },
  })
}

// POST /api/auth/mfa/setup - Verify and activate MFA
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

  if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return NextResponse.json(
      { success: false, error: 'Please provide a valid 6-digit code' },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaEnabled: true, mfaSecret: true },
  })

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  if (user.mfaEnabled) {
    return NextResponse.json(
      { success: false, error: 'MFA is already enabled' },
      { status: 409 },
    )
  }

  if (!user.mfaSecret) {
    return NextResponse.json(
      { success: false, error: 'No MFA setup in progress. Please start setup first.' },
      { status: 400 },
    )
  }

  const { decrypt } = await import('@/lib/auth-utils')
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
      { success: false, error: 'Invalid code. Please try again.' },
      { status: 400 },
    )
  }

  // Activate MFA
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: true },
  })

  // Audit log
  await prisma.ifAuditLog.create({
    data: {
      userId: session.user.id,
      action: 'mfa_enabled',
      metadata: {},
    },
  }).catch(() => null)

  return NextResponse.json({ success: true })
}
