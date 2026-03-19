'use client'

import { useState } from 'react'
import { Sparkles, TrendingUp, BarChart2, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NLQBar } from './NLQBar'
import { AIInsightsButton } from './AIInsightsButton'

// ============================================================
// Types
// ============================================================

type ChartSuggestion = {
  chartType: string
  reason: string
}

type AIInsightsPanelProps = {
  /**
   * The report ID — required to enable the AI Insights button after a run
   */
  reportId?: string
  /**
   * Result data from the latest report run — enables AI Insights button
   */
  resultRows?: unknown[]
  resultColumns?: unknown[]
  /**
   * Whether a report has been run at least once in the current session
   */
  hasResults?: boolean
  /**
   * Auto chart-type suggestion based on current field configuration
   */
  chartSuggestion?: ChartSuggestion | null
  locale?: 'en' | 'ar'
  onNLQResult?: (result: { definition: Record<string, unknown>; explanation: string }) => void
  onAddNarrativeToDashboard?: (narrative: string) => void
}

// ============================================================
// Chart type display names
// ============================================================

const CHART_TYPE_LABELS: Record<string, string> = {
  bar: 'Bar Chart',
  line: 'Line Chart',
  area: 'Area Chart',
  pie: 'Pie Chart',
  donut: 'Donut Chart',
  scatter: 'Scatter Plot',
  bubble: 'Bubble Chart',
  heatmap: 'Heat Map',
  treemap: 'Tree Map',
  funnel: 'Funnel Chart',
  gauge: 'Gauge',
  sankey: 'Sankey Diagram',
  radar: 'Radar Chart',
}

// ============================================================
// Component
// ============================================================

export function AIInsightsPanel({
  reportId,
  resultRows = [],
  resultColumns = [],
  hasResults = false,
  chartSuggestion,
  locale = 'en',
  onNLQResult,
  onAddNarrativeToDashboard,
}: AIInsightsPanelProps) {
  const [showSuggestion, setShowSuggestion] = useState(true)

  const isRtl = locale === 'ar'

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Panel Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <h3 className="text-sm font-semibold">
          {isRtl ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
        </h3>
        <Badge variant="secondary" className="text-xs">
          Beta
        </Badge>
      </div>

      {/* NLQ Bar */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <BarChart2 className="h-3 w-3" />
          {isRtl ? 'ابنِ تقريرًا بالغة الطبيعية' : 'Build a report with natural language'}
        </p>
        <NLQBar locale={locale} onResult={onNLQResult} />
      </div>

      {/* Chart Suggestion Banner */}
      {chartSuggestion && showSuggestion && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                    {isRtl ? 'اقتراح نوع المخطط' : 'Chart Type Suggestion'}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    {isRtl
                      ? `نوصي باستخدام ${CHART_TYPE_LABELS[chartSuggestion.chartType] ?? chartSuggestion.chartType}`
                      : `We recommend a ${CHART_TYPE_LABELS[chartSuggestion.chartType] ?? chartSuggestion.chartType}`}
                    {' — '}
                    {chartSuggestion.reason}
                  </p>
                </div>
              </div>
              <button
                className="text-blue-400 hover:text-blue-600 text-xs shrink-0"
                onClick={() => setShowSuggestion(false)}
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights Button */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
          <Info className="h-3 w-3" />
          {hasResults
            ? isRtl
              ? 'احصل على ملخص ذكاء اصطناعي لنتائج تقريرك'
              : 'Get an AI summary of your report results'
            : isRtl
              ? 'شغّل التقرير أولاً للحصول على رؤى الذكاء الاصطناعي'
              : 'Run the report first to get AI insights'}
        </p>

        {reportId && hasResults ? (
          <AIInsightsButton
            reportId={reportId}
            rows={resultRows}
            columns={resultColumns}
            locale={locale}
            onAddToDashboard={onAddNarrativeToDashboard}
          />
        ) : (
          <AIInsightsButton
            reportId={reportId ?? '__placeholder__'}
            rows={[]}
            columns={[]}
            locale={locale}
          />
        )}
      </div>
    </div>
  )
}

// Separate named export for the panel header/title
export function AIInsightsPanelTitle() {
  return (
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        AI Assistant
        <Badge variant="secondary" className="text-xs font-normal">
          Beta
        </Badge>
      </CardTitle>
    </CardHeader>
  )
}

export default AIInsightsPanel
