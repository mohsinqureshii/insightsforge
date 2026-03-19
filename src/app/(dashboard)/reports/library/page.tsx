import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SYSTEM_REPORTS } from '@/lib/system-content/reports'
import type { SystemReport, SystemReportCategory } from '@/lib/system-content/reports'
import { ReportLibraryClient } from './ReportLibraryClient'
import type { ReportType } from '@/types/insightsforge'

interface UserReport {
  id: string
  name: string
  description: string | null
  type: ReportType
  chartType: string | null
  visibility: string
  viewCount: number
  updatedAt: Date
  dataSource: { id: string; name: string } | null
}

async function getUserReports(tenantId: string, userId: string): Promise<UserReport[]> {
  return prisma.ifReport.findMany({
    where: {
      tenantId,
      deletedAt: null,
      config: {
        path: ['isSystemReport'],
        equals: false,
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      type: true,
      chartType: true,
      visibility: true,
      viewCount: true,
      updatedAt: true,
      createdBy: true,
      dataSource: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  }) as Promise<UserReport[]>
}

const CATEGORY_LABELS: Record<SystemReportCategory | 'all', string> = {
  all: 'All',
  operations: 'Operations',
  performance: 'Performance',
  security: 'Security',
  finance: 'Finance',
  hr: 'HR',
  it: 'IT',
}

const CATEGORIES: Array<SystemReportCategory | 'all'> = [
  'all',
  'operations',
  'performance',
  'security',
  'finance',
  'hr',
  'it',
]

export default async function ReportLibraryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const tenantId = session.activeTenantId
  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="mb-2 text-2xl font-bold">No organization found</h2>
        <p className="text-muted-foreground">You&apos;re not a member of any organization yet.</p>
      </div>
    )
  }

  const userReports = await getUserReports(tenantId, session.user.id)

  return (
    <ReportLibraryClient
      systemReports={SYSTEM_REPORTS}
      userReports={userReports}
      categories={CATEGORIES}
      categoryLabels={CATEGORY_LABELS}
    />
  )
}
