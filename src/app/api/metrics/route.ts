import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { collectMetrics, toPrometheusText } from '@/lib/monitoring/metrics'
import type { ApiResponse } from '@/types/insightsforge'

export const dynamic = 'force-dynamic'

const METRICS_TOKEN = process.env.METRICS_TOKEN

/**
 * GET /api/metrics
 *
 * Returns Prometheus-format metrics (text/plain) when the Accept header
 * includes text/plain or a `format=prometheus` query param is set.
 * Otherwise returns JSON.
 *
 * Authentication: Bearer token via METRICS_TOKEN env var, OR super_admin session.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // Auth: either a static scrape token or a super_admin session
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  const tokenValid = METRICS_TOKEN && bearerToken === METRICS_TOKEN
  if (!tokenValid) {
    const session = await getServerSession(authOptions)
    const role = (session?.user as unknown as { role?: string } | null)?.role
    if (role !== 'super_admin') {
      const body: ApiResponse<never> = { success: false, error: 'Unauthorized' }
      return NextResponse.json(body, { status: 401 })
    }
  }

  const snapshot = await collectMetrics()

  const wantsPrometheus =
    req.nextUrl.searchParams.get('format') === 'prometheus' ||
    (req.headers.get('accept') ?? '').includes('text/plain')

  if (wantsPrometheus) {
    return new NextResponse(toPrometheusText(snapshot), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' },
    })
  }

  return NextResponse.json({ success: true, data: snapshot } satisfies ApiResponse<typeof snapshot>)
}
