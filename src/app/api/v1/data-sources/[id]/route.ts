import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { encryptCredential, decryptCredential } from '@/lib/encryption'
import type { ApiResponse, DataSource } from '@/types/insightsforge'

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

type Params = { params: { id: string } }

// GET /api/v1/data-sources/:id
export async function GET(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<DataSource & { configPreview?: Record<string, unknown> }>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DATA_SOURCE_READ')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const source = await prisma.ifDataSource.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })

  if (!source) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 })
  }

  // Decrypt config and strip sensitive fields for response
  let configPreview: Record<string, unknown> = {}
  try {
    const decrypted = decryptCredential(source.config)
    const config = JSON.parse(decrypted) as Record<string, unknown>
    // Remove sensitive fields
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKeyValue', 'bearerToken', 'basicPassword']
    configPreview = Object.fromEntries(
      Object.entries(config).map(([k, v]) => [
        k,
        sensitiveKeys.some((sk) => k.toLowerCase().includes(sk.toLowerCase()))
          ? '••••••••'
          : v,
      ]),
    )
  } catch {
    configPreview = {}
  }

  return NextResponse.json({
    success: true,
    data: {
      id: source.id,
      tenantId: source.tenantId,
      name: source.name,
      description: source.description,
      type: source.type as unknown as DataSource['type'],
      isActive: source.isActive,
      lastTestedAt: source.lastTestedAt,
      lastSyncAt: source.lastSyncAt,
      createdBy: source.createdBy,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
      schema: (source.schema as DataSource['schema']) ?? undefined,
      configPreview,
    },
  })
}

// PUT /api/v1/data-sources/:id
export async function PUT(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<DataSource>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DATA_SOURCE_UPDATE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const source = await prisma.ifDataSource.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })
  if (!source) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { name, description, config, isActive } = parsed.data
  const updateData: Record<string, unknown> = {}

  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (isActive !== undefined) updateData.isActive = isActive

  if (config !== undefined) {
    try {
      // Merge with existing config for partial updates
      const existingDecrypted = decryptCredential(source.config)
      const existingConfig = JSON.parse(existingDecrypted) as Record<string, unknown>
      const mergedConfig = { ...existingConfig, ...config }
      updateData.config = encryptCredential(JSON.stringify(mergedConfig))
    } catch {
      updateData.config = encryptCredential(JSON.stringify(config))
    }
  }

  const updated = await prisma.ifDataSource.update({
    where: { id: params.id },
    data: updateData as never,
  })

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      tenantId: updated.tenantId,
      name: updated.name,
      description: updated.description,
      type: updated.type as unknown as DataSource['type'],
      isActive: updated.isActive,
      lastTestedAt: updated.lastTestedAt,
      lastSyncAt: updated.lastSyncAt,
      createdBy: updated.createdBy,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
}

// DELETE /api/v1/data-sources/:id
export async function DELETE(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  try {
    await requirePermission(session.user.id, tenantId, 'DATA_SOURCE_DELETE')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Forbidden'
    return NextResponse.json({ success: false, error: message }, { status: 403 })
  }

  const source = await prisma.ifDataSource.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
  })
  if (!source) {
    return NextResponse.json({ success: false, error: 'Data source not found' }, { status: 404 })
  }

  // Soft delete
  await prisma.ifDataSource.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), isActive: false },
  })

  return NextResponse.json({ success: true })
}
