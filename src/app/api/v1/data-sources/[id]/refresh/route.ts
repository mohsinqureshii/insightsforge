import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { decryptCredential } from '@/lib/encryption'
import { getConnector } from '@/lib/connectors'
import { cacheInvalidatePattern } from '@/lib/redis'
import type { ApiResponse } from '@/types/insightsforge'

type Params = { params: { id: string } }

// POST /api/v1/data-sources/:id/refresh
// Triggers a schema refresh (re-introspection) and invalidates any cached queries.
export async function POST(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<{ refreshedAt: string; fieldCount: number }>>> {
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

  const connector = getConnector(source.type as never)
  if (!connector) {
    return NextResponse.json(
      { success: false, error: `Connector type '${source.type}' is not yet implemented` },
      { status: 501 },
    )
  }

  let config: Record<string, unknown>
  try {
    const decrypted = decryptCredential(source.config)
    config = JSON.parse(decrypted) as Record<string, unknown>
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to decrypt credentials'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }

  try {
    const fields = await connector.introspect({ type: source.type, ...config })

    const now = new Date()
    await prisma.ifDataSource.update({
      where: { id: params.id },
      data: {
        schema: {
          fields,
          lastFetched: now.toISOString(),
        },
        lastSyncAt: now,
      },
    })

    // Invalidate all cached query results for this data source
    await cacheInvalidatePattern(`if:query:*:${params.id}:*`)

    return NextResponse.json({
      success: true,
      data: {
        refreshedAt: now.toISOString(),
        fieldCount: fields.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refresh failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
