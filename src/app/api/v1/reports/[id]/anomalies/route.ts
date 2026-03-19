// POST /api/v1/reports/:id/anomalies — Anomaly Detection
// Auth: Session JWT + active tenant
// No rate limit (purely local computation, no AI calls)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { detectAnomalies } from '@/lib/ai/anomaly'
import type { ApiResponse } from '@/types/insightsforge'
import type { AnomalyPoint } from '@/lib/ai/anomaly'

const bodySchema = z.object({
  values: z.array(z.number()).min(1).max(10000),
  timestamps: z.array(z.string()),
})

type Params = { params: { id: string } }

export async function POST(
  req: NextRequest,
  { params }: Params,
): Promise<NextResponse<ApiResponse<{ anomalies: AnomalyPoint[] }>>> {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'No active tenant' }, { status: 400 })
  }

  // Verify the report belongs to this tenant
  const report = await prisma.ifReport.findFirst({
    where: { id: params.id, tenantId, deletedAt: null },
    select: { id: true },
  })

  if (!report) {
    return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Validation error' },
      { status: 422 },
    )
  }

  const { values, timestamps } = parsed.data

  // Pad or trim timestamps to match values length
  const normalizedTimestamps = values.map((_, i) => timestamps[i] ?? String(i))

  const anomalies = detectAnomalies(values, normalizedTimestamps)

  return NextResponse.json({ success: true, data: { anomalies } })
}
