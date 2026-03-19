// InsightForge – AI Dashboard Builder
// Generates a DashboardDefinition from a natural language prompt via Claude

import { z } from 'zod'
import { anthropic } from './client'

// ============================================================
// Types
// ============================================================

export type ReportSummary = {
  id: string
  name: string
  description: string | null
  type: string
  chartType: string | null
}

export type WidgetDefinition = {
  reportId: string | null
  title: string
  type: 'report' | 'metric' | 'text'
  position: {
    x: number
    y: number
    w: number
    h: number
  }
  config?: Record<string, unknown>
}

export type DashboardDefinition = {
  name: string
  description: string
  widgets: WidgetDefinition[]
  explanation: string
}

// ============================================================
// Zod schema for Claude's JSON response
// ============================================================

const widgetPositionSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(12),
})

const widgetDefinitionSchema = z.object({
  reportId: z.string().nullable(),
  title: z.string(),
  type: z.enum(['report', 'metric', 'text']),
  position: widgetPositionSchema,
  config: z.record(z.unknown()).optional(),
})

const dashboardDefinitionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string(),
  widgets: z.array(widgetDefinitionSchema).min(1).max(20),
  explanation: z.string(),
})

// ============================================================
// Main function
// ============================================================

export async function generateDashboardFromPrompt(
  prompt: string,
  availableReports: ReportSummary[],
  locale: 'en' | 'ar' = 'en',
): Promise<DashboardDefinition> {
  const reportsContext =
    availableReports.length > 0
      ? availableReports
          .map(
            (r) =>
              `  - id="${r.id}" name="${r.name}" type=${r.type}${r.chartType ? ` chartType=${r.chartType}` : ''}${r.description ? ` description="${r.description}"` : ''}`,
          )
          .join('\n')
      : '  No reports available yet. Use null for reportId and suggest creating reports first.'

  const systemPrompt = `You are InsightForge's AI dashboard builder. Your job is to convert a user's dashboard description into a structured dashboard layout definition.

GRID SYSTEM: Dashboards use a 12-column grid. Widget positions use (x, y, w, h) where:
- x: column start (0-11)
- y: row start (0+)
- w: width in columns (1-12)
- h: height in rows (1-12)

WIDGET TYPES:
- "report": Displays a linked report/chart (set reportId to an existing report id)
- "metric": A single KPI number (set reportId if linked to a report)
- "text": A text/header widget (reportId = null)

AVAILABLE REPORTS:
${reportsContext}

RULES:
- Select the most relevant reports from the list above to match the user's request
- Lay widgets out logically: metrics on top, charts below, related widgets side by side
- Use w=12 for large charts, w=6 for medium, w=4 for small/metrics
- h=3 for metrics, h=6 for charts, h=4 for tables
- Never overlap widgets (different y positions or side-by-side with correct x offsets)
- Write the name, description, and explanation in ${locale === 'ar' ? 'Arabic' : 'English'}
- Return ONLY valid JSON with keys: name, description, widgets, explanation
- explanation: a brief plain-language summary of the dashboard layout and report selections`

  const userMessage =
    locale === 'ar'
      ? `طلب المستخدم: ${prompt}\n\nأنشئ تعريف لوحة تحكم JSON.`
      : `User request: ${prompt}\n\nGenerate the dashboard definition JSON.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI')
  }

  let rawJson = textContent.text.trim()
  if (rawJson.startsWith('```')) {
    rawJson = rawJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('AI returned invalid JSON')
  }

  const validated = dashboardDefinitionSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(
      `AI response failed validation: ${validated.error.issues[0]?.message ?? 'unknown'}`,
    )
  }

  return validated.data as DashboardDefinition
}
