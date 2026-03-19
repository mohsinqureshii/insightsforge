// InsightForge – Natural Language Query → Report Definition
// Converts plain-language questions into structured ReportDefinition objects via Claude

import { z } from 'zod'
import { anthropic } from './client'
import type { ReportDefinition, FieldConfig, FilterConfig } from '@/lib/query-engine/types'

// ============================================================
// Supporting Types
// ============================================================

export type DataSourceSummary = {
  id: string
  name: string
  type: string
  tables: {
    name: string
    columns: {
      name: string
      type: string
      description?: string
    }[]
  }[]
}

export type NLQResult = {
  definition: ReportDefinition
  explanation: string
}

// ============================================================
// Zod schema for Claude's JSON response
// ============================================================

const fieldConfigSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  tableName: z.string(),
  columnName: z.string(),
  label: z.string(),
  type: z.enum(['string', 'number', 'date', 'boolean', 'array', 'json']),
  isDimension: z.boolean(),
  isMeasure: z.boolean(),
  aggregation: z
    .enum(['sum', 'avg', 'count', 'min', 'max', 'distinct_count', 'median', 'stddev', 'variance', 'first', 'last'])
    .optional(),
  dateGranularity: z.enum(['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute']).optional(),
  format: z.string().optional(),
  isCalculated: z.boolean().optional(),
  formula: z.string().optional(),
})

const filterConfigSchema = z.object({
  id: z.string(),
  fieldId: z.string(),
  field: z.string(),
  operator: z.enum([
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'contains', 'not_contains', 'starts_with', 'ends_with',
    'is_null', 'is_not_null', 'in', 'not_in', 'between',
  ]),
  value: z.unknown(),
  type: z.enum(['string', 'number', 'date', 'boolean', 'array', 'json']),
})

const sortConfigSchema = z.object({
  fieldId: z.string(),
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
  priority: z.number(),
})

const chartConfigSchema = z.object({
  type: z.enum([
    'bar', 'line', 'area', 'pie', 'donut', 'scatter', 'bubble',
    'heatmap', 'treemap', 'funnel', 'gauge', 'sankey', 'radar',
  ]),
  xAxisField: z.string().optional(),
  yAxisFields: z.array(z.string()).optional(),
  groupByField: z.string().optional(),
  smooth: z.boolean().optional(),
  stack: z.boolean().optional(),
  showLegend: z.boolean().optional(),
  showDataLabels: z.boolean().optional(),
  orientation: z.enum(['vertical', 'horizontal']).optional(),
}).optional()

const nlqResponseSchema = z.object({
  dataSourceId: z.string(),
  fields: z.array(fieldConfigSchema),
  filters: z.array(filterConfigSchema),
  sorts: z.array(sortConfigSchema),
  chartConfig: chartConfigSchema,
  title: z.string(),
  explanation: z.string(),
  limit: z.number().optional(),
})

// ============================================================
// Helpers
// ============================================================

function buildFieldCatalogue(dataSources: DataSourceSummary[]): string {
  return dataSources
    .map((ds) => {
      const tables = ds.tables
        .map((t) => {
          const cols = t.columns
            .map((c) => `      - ${c.name} (${c.type})${c.description ? ': ' + c.description : ''}`)
            .join('\n')
          return `    Table: ${t.name}\n${cols}`
        })
        .join('\n')
      return `  DataSource: "${ds.name}" (id="${ds.id}", type=${ds.type})\n${tables}`
    })
    .join('\n\n')
}

// ============================================================
// Main function
// ============================================================

export async function generateReportFromNLQ(
  question: string,
  dataSources: DataSourceSummary[],
  locale: 'en' | 'ar' = 'en',
): Promise<NLQResult> {
  const fieldCatalogue = buildFieldCatalogue(dataSources)

  const systemPrompt = `You are InsightForge's AI query builder. Your job is to translate a user's natural language question into a structured report definition JSON object.

AVAILABLE CHART TYPES: bar, line, area, pie, donut, scatter, bubble, heatmap, treemap, funnel, gauge, sankey, radar

AVAILABLE FIELD TYPES: string, number, date, boolean

AVAILABLE AGGREGATIONS: sum, avg, count, min, max, distinct_count, median, stddev, variance, first, last

AVAILABLE DATE GRANULARITIES: year, quarter, month, week, day, hour, minute

AVAILABLE FILTER OPERATORS: eq, neq, gt, gte, lt, lte, contains, not_contains, starts_with, ends_with, is_null, is_not_null, in, not_in, between

REPORT DEFINITION STRUCTURE:
{
  "dataSourceId": "<id of the data source to query>",
  "fields": [
    {
      "id": "f1",
      "sourceId": "<dataSourceId>",
      "tableName": "<table name>",
      "columnName": "<column name>",
      "label": "<human label>",
      "type": "<field type>",
      "isDimension": true|false,
      "isMeasure": true|false,
      "aggregation": "<optional aggregation for measures>",
      "dateGranularity": "<optional for date dimensions>"
    }
  ],
  "filters": [...],
  "sorts": [...],
  "chartConfig": { "type": "<chart type>", ... },
  "title": "<report title>",
  "explanation": "<plain language explanation of what the report shows and why this structure was chosen>",
  "limit": <optional row limit>
}

AVAILABLE DATA SOURCES AND FIELDS:
${fieldCatalogue || 'No data sources available yet. Suggest that the user connects a data source first.'}

RULES:
- Always choose the most appropriate data source from the list above
- Match column names exactly as they appear in the field catalogue
- Use isDimension=true for grouping/category fields, isMeasure=true for numeric aggregated fields
- Choose the most appropriate chart type for the data (e.g. bar for comparisons, line for trends, pie for proportions)
- Write the explanation in ${locale === 'ar' ? 'Arabic' : 'English'}
- Return ONLY valid JSON, no markdown, no explanation outside the JSON`

  const userMessage =
    locale === 'ar'
      ? `سؤال المستخدم: ${question}\n\nقم بإنشاء تعريف تقرير JSON.`
      : `User question: ${question}\n\nGenerate the report definition JSON.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  // Extract text content from response
  const textContent = message.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI')
  }

  // Parse JSON – strip any accidental markdown fences
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

  const validated = nlqResponseSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error(`AI response failed validation: ${validated.error.issues[0]?.message ?? 'unknown'}`)
  }

  const data = validated.data

  const definition: ReportDefinition = {
    name: data.title,
    dataSourceId: data.dataSourceId,
    fields: data.fields as FieldConfig[],
    filters: data.filters as FilterConfig[],
    sorts: data.sorts,
    chartConfig: data.chartConfig,
    limit: data.limit,
  }

  return {
    definition,
    explanation: data.explanation,
  }
}
