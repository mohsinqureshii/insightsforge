'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Copy, Check, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

type AIInsightsButtonProps = {
  reportId: string
  rows: unknown[]
  columns: unknown[]
  locale?: 'en' | 'ar'
  onAddToDashboard?: (narrative: string) => void
}

// ============================================================
// Component
// ============================================================

export function AIInsightsButton({
  reportId,
  rows,
  columns,
  locale = 'en',
  onAddToDashboard,
}: AIInsightsButtonProps) {
  const [loading, setLoading] = useState(false)
  const [narrative, setNarrative] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerateInsights() {
    if (loading) return
    setLoading(true)
    setNarrative(null)

    try {
      const res = await fetch(`/api/v1/reports/${reportId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, columns, locale }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to generate insights')
      }

      setNarrative(json.data.narrative as string)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!narrative) return
    try {
      await navigator.clipboard.writeText(narrative)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success(locale === 'ar' ? 'تم النسخ!' : 'Copied to clipboard!')
    } catch {
      toast.error(locale === 'ar' ? 'فشل النسخ' : 'Failed to copy')
    }
  }

  function handleAddToDashboard() {
    if (!narrative) return
    if (onAddToDashboard) {
      onAddToDashboard(narrative)
    } else {
      // Default: copy to clipboard for manual paste
      void handleCopy()
      toast.info(
        locale === 'ar'
          ? 'تم النسخ — الصقه في أداة نص لوحة التحكم'
          : 'Copied — paste into a dashboard text widget',
      )
    }
  }

  const buttonLabel =
    locale === 'ar'
      ? loading
        ? 'جارٍ التحليل...'
        : 'رؤى الذكاء الاصطناعي'
      : loading
        ? 'Generating insights...'
        : 'AI Insights'

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleGenerateInsights()}
        disabled={loading || rows.length === 0}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 text-violet-500" />
        )}
        {buttonLabel}
      </Button>

      {narrative && (
        <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/20">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              {locale === 'ar' ? 'رؤى الذكاء الاصطناعي' : 'AI Insights'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <p className="text-sm text-foreground leading-relaxed" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
              {narrative}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void handleCopy()}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                {copied
                  ? locale === 'ar'
                    ? 'تم النسخ'
                    : 'Copied!'
                  : locale === 'ar'
                    ? 'نسخ'
                    : 'Copy'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddToDashboard}
                className="gap-1.5"
              >
                <LayoutDashboard className="h-3 w-3" />
                {locale === 'ar' ? 'إضافة إلى لوحة التحكم كنص' : 'Add to Dashboard as Text Widget'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AIInsightsButton
