import { NextResponse } from 'next/server'
import { DASHBOARD_TEMPLATES } from '@/lib/system-content/dashboards'
import type { ApiResponse } from '@/types/insightsforge'
import type { DashboardTemplate } from '@/lib/system-content/dashboards'

export const dynamic = 'force-dynamic'

// GET /api/v1/dashboard-templates – public catalogue; no auth required
export async function GET(): Promise<NextResponse<ApiResponse<DashboardTemplate[]>>> {
  return NextResponse.json(
    { success: true, data: DASHBOARD_TEMPLATES },
    {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  )
}
