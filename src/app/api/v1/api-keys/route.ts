import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { generateApiKey, hashApiKey } from '@/lib/auth-utils'
import { z } from 'zod'
import type { ApiResponse, ApiKey } from '@/types/insightsforge'

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z
    .array(
      z.enum([
        'reports:read',
        'reports:write',
        'dashboards:read',
        'dashboards:write',
        'data_sources:read',
        'data_sources:write',
        'users:read',
        'users:write',
        'exports:download',
        'queries:execute',
      ]),
    )
    .min(1),
  expiresAt: z.string().datetime().optional(),
})

interface CreateApiKeyResponse {
  apiKey: ApiKey
  rawKey: string // only returned once
}

// GET /api/v1/api-keys - List API keys
export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<ApiKey[]>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'API_KEY_READ')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const keys = await prisma.ifApiKey.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      tenantId: true,
      userId: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    success: true,
    data: keys as unknown as ApiKey[],
  })
}

// POST /api/v1/api-keys - Create a new API key
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<CreateApiKeyResponse>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'API_KEY_CREATE')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = createKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0]?.message ?? 'Validation failed' },
      { status: 422 },
    )
  }

  const { name, scopes, expiresAt } = parsed.data
  const { key, keyHash, keyPrefix } = generateApiKey()

  const created = await prisma.ifApiKey.create({
    data: {
      tenantId,
      userId: session.user.id,
      name,
      keyHash,
      keyPrefix,
      scopes: scopes as string[],
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
    },
  })

  await prisma.ifAuditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'api_key_created',
      entityType: 'api_key',
      entityId: created.id,
      metadata: { name, scopes },
    },
  }).catch(() => null)

  const apiKey: ApiKey = {
    id: created.id,
    tenantId: created.tenantId,
    userId: created.userId,
    name: created.name,
    keyPrefix: created.keyPrefix,
    scopes: created.scopes as ApiKey['scopes'],
    lastUsedAt: created.lastUsedAt,
    expiresAt: created.expiresAt,
    isActive: created.isActive,
    createdAt: created.createdAt,
  }

  return NextResponse.json(
    { success: true, data: { apiKey, rawKey: key } },
    { status: 201 },
  )
}

// DELETE /api/v1/api-keys - Revoke an API key
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active organization' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'API_KEY_REVOKE')
  } catch {
    return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const keyId = searchParams.get('id')

  if (!keyId) {
    return NextResponse.json({ success: false, error: 'Key ID is required' }, { status: 400 })
  }

  const key = await prisma.ifApiKey.findFirst({
    where: { id: keyId, tenantId },
  })

  if (!key) {
    return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404 })
  }

  await prisma.ifApiKey.update({
    where: { id: keyId },
    data: { isActive: false },
  })

  await prisma.ifAuditLog.create({
    data: {
      tenantId,
      userId: session.user.id,
      action: 'api_key_revoked',
      entityType: 'api_key',
      entityId: keyId,
      metadata: { name: key.name },
    },
  }).catch(() => null)

  return NextResponse.json({ success: true })
}
