'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { LayoutDashboard, BarChart3 } from 'lucide-react'
import type { DashboardTemplate, DashboardCategory } from '@/lib/system-content/dashboards'

const CATEGORY_COLORS: Record<DashboardCategory | string, string> = {
  operations: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  executive: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  it: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  hr: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
}

interface TemplateGalleryProps {
  onSelect: (templateId: string, templateName: string) => void
}

export function TemplateGallery({ onSelect }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/dashboard-templates')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load templates')
        const json = await res.json()
        return (json as { data: DashboardTemplate[] }).data
      })
      .then((data) => setTemplates(data))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load templates'
        setError(message)
      })
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Start from a Template</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading templates...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4 mt-1" />
              </CardHeader>
              <CardContent className="flex-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-1" />
              </CardContent>
              <CardFooter className="pt-0">
                <Skeleton className="h-8 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-dashed">
        <LayoutDashboard className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Could not load templates</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Start from a Template</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a pre-built dashboard to get started quickly. You can customise it after creation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const widgetCount = template.layout.widgets.length
          const colorClass =
            CATEGORY_COLORS[template.category] ??
            'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'

          return (
            <Card key={template.id} className="flex flex-col hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                {/* Thumbnail / colour swatch */}
                <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-muted/50">
                  {template.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <BarChart3 className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm leading-snug">{template.name}</CardTitle>
                  <span
                    className={[
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                      colorClass,
                    ].join(' ')}
                  >
                    {template.category}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-0.5">
                  {widgetCount} widget{widgetCount !== 1 ? 's' : ''}
                </p>
              </CardHeader>

              <CardContent className="flex-1">
                <CardDescription className="text-xs leading-relaxed line-clamp-3">
                  {template.description}
                </CardDescription>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => onSelect(template.id, template.name)}
                >
                  Start from template
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
