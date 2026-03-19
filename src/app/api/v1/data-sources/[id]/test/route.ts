import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requirePermission } from '@/lib/rbac'
import { decryptCredential } from '@/lib/encryption'
import { getConnector } from '@/lib/connectors'
import type { ApiResponse } from '@/types/insightsforge'
import type { ConnectorTestResult } from '@/lib/connectors/base'

type Params = { params: { id: string } }

// POST /api/v1/data-sources/:id/test
export async function POST(
  _req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<ConnectorTestResult>>> {
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

  const connector = getConnector(source.type as never)
  if (!connector) {
    return NextResponse.json(
      {
        success: false,
        error: `Connector type '${source.type}' is not yet implemented`,
      },
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

  const testResult = await connector.test({ type: source.type, ...config })

  // Update lastTestedAt timestamp
  await prisma.ifDataSource.update({
    where: { id: params.id },
    data: { lastTestedAt: new Date() },
  })

  return NextResponse.json({ success: testResult.success, data: testResult })
}
