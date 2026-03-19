'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  BarChart3,
  Search,
  Copy,
  Edit2,
  Trash2,
  Eye,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { SystemReport, SystemReportCategory } from '@/lib/system-content/reports'
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

interface ReportLibraryClientProps {
  systemReports: SystemReport[]
  userReports: UserReport[]
  categories: Array<SystemReportCategory | 'all'>
  categoryLabels: Record<SystemReportCategory | 'all', string>
}

const CATEGORY_COLORS: Record<SystemReportCategory, string> = {
  operations: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  performance: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  finance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  hr: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  it: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
}

async function duplicateReport(reportId: string): Promise<{ id: string }> {
  const res = await fetch(`/api/v1/reports/${reportId}/duplicate`, {
    method: 'POST',
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error((json as { error?: string }).error ?? 'Failed to duplicate report')
  }
  const json = await res.json()
  return (json as { data: { id: string } }).data
}

async function deleteReport(reportId: string): Promise<void> {
  const res = await fetch(`/api/v1/reports/${reportId}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete report')
}

export function ReportLibraryClient({
  systemReports,
  userReports,
  categories,
  categoryLabels,
}: ReportLibraryClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<SystemReportCategory | 'all'>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const query = search.toLowerCase().trim()

  const filteredSystem = systemReports.filter((r) => {
    const matchesCategory = activeCategory === 'all' || r.category === activeCategory
    const matchesSearch =
      !query || r.name.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })

  const filteredUser = userReports.filter((r) => {
    const matchesSearch =
      !query ||
      r.name.toLowerCase().includes(query) ||
      (r.description ?? '').toLowerCase().includes(query)
    return matchesSearch
  })

  function handleDuplicate(reportId: string, reportName: string) {
    setLoadingId(reportId)
    duplicateReport(reportId)
      .then((data) => {
        toast.success(`"${reportName}" copied to My Reports`)
        startTransition(() => {
          router.push(`/reports/${data.id}`)
          router.refresh()
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to duplicate report'
        toast.error(message)
      })
      .finally(() => setLoadingId(null))
  }

  function handleDelete(reportId: string, reportName: string) {
    if (!confirm(`Delete "${reportName}"? This cannot be undone.`)) return
    setLoadingId(reportId)
    deleteReport(reportId)
      .then(() => {
        toast.success(`"${reportName}" deleted`)
        startTransition(() => {
          router.refresh()
        })
      })
      .catch(() => toast.error('Failed to delete report'))
      .finally(() => setLoadingId(null))
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Report Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse system reports and your personal reports
          </p>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 border-b">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={[
                'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                activeCategory === cat
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {categoryLabels[cat]}
              {cat === 'all' ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {systemReports.length}
                </span>
              ) : (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                  {systemReports.filter((r) => r.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── System Reports ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          System Reports
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({filteredSystem.length})
          </span>
        </h2>

        {filteredSystem.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
            <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No system reports match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSystem.map((report) => (
              <Card key={report.id} className="flex flex-col hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  {/* Preview image placeholder */}
                  <div className="mb-3 flex h-28 items-center justify-center rounded-lg bg-muted/50">
                    {report.previewImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={report.previewImageUrl}
                        alt={report.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    ) : (
                      <BarChart3 className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm leading-snug">{report.name}</CardTitle>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        CATEGORY_COLORS[report.category],
                      ].join(' ')}
                    >
                      {report.category}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 pb-2">
                  <CardDescription className="text-xs leading-relaxed line-clamp-3">
                    {report.description}
                  </CardDescription>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleDuplicate(report.id, report.name)}
                    disabled={loadingId === report.id || isPending}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    {loadingId === report.id ? 'Copying...' : 'Use as Template'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── My Reports ── */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          My Reports
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({filteredUser.length})
          </span>
        </h2>

        {filteredUser.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
            <BarChart3 className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {search ? 'No reports match your search' : 'No personal reports yet — use a system report template to get started'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data Source</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Visibility</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredUser.map((report) => (
                  <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <Link
                          href={`/reports/${report.id}`}
                          className="font-medium hover:underline truncate block max-w-[240px]"
                        >
                          {report.name}
                        </Link>
                        {report.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                            {report.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {report.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {report.dataSource ? (
                        <span className="text-sm text-muted-foreground">{report.dataSource.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {report.visibility}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <Link href={`/reports/${report.id}`}>
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <Link href={`/reports/${report.id}/edit`}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          disabled={loadingId === report.id}
                          onClick={() => handleDelete(report.id, report.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
