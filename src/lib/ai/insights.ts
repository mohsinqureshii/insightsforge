// InsightForge – AI Insight Narrative Generator
// Produces a plain-language summary of report result data via Claude streaming

import { anthropic } from './client'

// ============================================================
// Types
// ============================================================

export type ReportResultMeta = {
  reportName: string
  rowCount: number
  durationMs?: number
}

export type InsightNarrativeResult = {
  narrative: string
}

// ============================================================
// Main function
// ============================================================

export async function generateInsightNarrative(
  rows: unknown[],
  columns: unknown[],
  meta: ReportResultMeta,
  locale: 'en' | 'ar' = 'en',
): Promise<InsightNarrativeResult> {
  const languageInstruction =
    locale === 'ar'
      ? 'Write your response in Arabic.'
      : 'Write your response in English.'

  const systemPrompt = `You are an analytics assistant for InsightForge, a business intelligence platform. Given report data, write a concise plain-language summary of the key findings.

Your summary MUST:
- Be 3 to 5 sentences long (maximum 300 words)
- Include: the top/highest value found, the overall trend direction (increasing/decreasing/stable), any notable outliers or anomalies, and a comparison if time-period data is available
- Use business-friendly language — avoid technical jargon
- Be factual and grounded in the data provided
- ${languageInstruction}
- Return ONLY the narrative text, no JSON, no headers, no bullet points`

  // Summarise data for the prompt (cap at 50 rows to avoid token overflow)
  const sampleRows = Array.isArray(rows) ? rows.slice(0, 50) : []
  const dataPayload = JSON.stringify(
    {
      reportName: meta.reportName,
      rowCount: meta.rowCount,
      columns,
      sampleRows,
    },
    null,
    2,
  )

  const userMessage =
    locale === 'ar'
      ? `بيانات التقرير:\n${dataPayload}\n\nاكتب ملخصاً تحليلياً موجزاً.`
      : `Report data:\n${dataPayload}\n\nWrite a concise analytical summary.`

  // Use streaming for longer narratives
  let narrative = ''

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      narrative += event.delta.text
    }
  }

  return { narrative: narrative.trim() }
}
