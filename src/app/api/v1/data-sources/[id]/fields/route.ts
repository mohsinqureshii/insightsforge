import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { decryptCredential } from '@/lib/encryption'
import { getConnector } from '@/lib/connectors'
import type { ApiResponse } from '@/types/insightsforge'
import type { FieldDefinition } from '@/lib/connectors/base'

type Params = { params: { id: string } }

// GET /api/v1/data-sources/:id/fields
// Returns the cached field catalogue, or re-introspects if stale.
export async function GET(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<{ fields: FieldDefinition[]; lastFetched: string | null }>>> {
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

  const forceRefresh = req.nextUrl.searchParams.get('refresh') === 'true'

  // Return cached schema if available and not forcing refresh
  const cachedSchema = source.schema as { fields?: FieldDefinition[]; lastFetched?: string } | null
  if (!forceRefresh && cachedSchema?.fields?.length) {
    return NextResponse.json({
      success: true,
      data: {
        fields: cachedSchema.fields,
        lastFetched: cachedSchema.lastFetched ?? null,
      },
    })
  }

  // Introspect the data source
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
    const now = new Date().toISOString()

    // Cache the schema
    await prisma.ifDataSource.update({
      where: { id: params.id },
      data: { schema: { fields, lastFetched: now } },
    })

    return NextResponse.json({ success: true, data: { fields, lastFetched: now } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Introspection failed'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
