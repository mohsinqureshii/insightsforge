'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Code2, LayoutDashboard } from 'lucide-react'

interface DashboardTemplate {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  category: string
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'marketing-overview',
    title: 'Marketing Overview',
    description:
      'Track campaign performance, traffic sources, conversion rates, and marketing ROI in one place.',
    icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
    category: 'Marketing',
  },
  {
    id: 'sales-pipeline',
    title: 'Sales Pipeline',
    description:
      'Monitor deals by stage, revenue forecasts, win rates, and rep performance metrics.',
    icon: <BarChart3 className="h-6 w-6 text-emerald-500" />,
    category: 'Sales',
  },
  {
    id: 'engineering-metrics',
    title: 'Engineering Metrics',
    description:
      'Visualize deployment frequency, lead time, incident rates, and system reliability (DORA metrics).',
    icon: <Code2 className="h-6 w-6 text-violet-500" />,
    category: 'Engineering',
  },
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description:
      'High-level KPIs across revenue, customer growth, churn, and operational health for leadership reviews.',
    icon: <LayoutDashboard className="h-6 w-6 text-amber-500" />,
    category: 'Executive',
  },
]

interface TemplateGalleryProps {
  onSelectTemplate: (templateId: string) => void
}

export function TemplateGallery({ onSelectTemplate }: TemplateGalleryProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Start from a Template</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose a pre-built dashboard to get started quickly. You can customise it after creation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TEMPLATES.map((template) => (
          <Card
            key={template.id}
            className="flex flex-col hover:shadow-md transition-shadow cursor-default"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50">
                  {template.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{template.title}</CardTitle>
                  <span className="text-xs text-muted-foreground">{template.category}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription className="text-sm leading-relaxed">
                {template.description}
              </CardDescription>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                className="w-full"
                size="sm"
                onClick={() => onSelectTemplate(template.id)}
              >
                Use Template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
