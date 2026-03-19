'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, Loader2, ChevronDown, History, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

type NLQResultData = {
  definition: Record<string, unknown>
  explanation: string
}

type NLQBarProps = {
  locale?: 'en' | 'ar'
  onResult?: (result: NLQResultData) => void
}

const HISTORY_KEY = 'insightsforge:nlq:history'
const MAX_HISTORY = 20

// ============================================================
// Helpers
// ============================================================

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function saveToHistory(query: string): void {
  try {
    const history = loadHistory()
    const deduplicated = [query, ...history.filter((h) => h !== query)].slice(0, MAX_HISTORY)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(deduplicated))
  } catch {
    // localStorage may be unavailable (SSR/private browsing)
  }
}

// ============================================================
// Component
// ============================================================

export function NLQBar({ locale = 'en', onResult }: NLQBarProps) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<NLQResultData | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const placeholder =
    locale === 'ar'
      ? 'اسأل InsightForge... (مثال: "أظهر أوامر العمل حسب الموقع هذا الشهر")'
      : "Ask InsightForge... (e.g. 'Show work orders by site this month')"

  // Load history on mount (client-only)
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  // Close history dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSubmit() {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setResult(null)
    setShowHistory(false)

    try {
      const res = await fetch('/api/v1/reports/nlq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, locale }),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'Failed to generate report')
      }

      const data = json.data as NLQResultData
      setResult(data)
      saveToHistory(trimmed)
      setHistory(loadHistory())
      onResult?.(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleSubmit()
    } else if (e.key === 'Escape') {
      setShowHistory(false)
    }
  }

  function selectHistory(item: string) {
    setQuestion(item)
    setShowHistory(false)
    inputRef.current?.focus()
  }

  function openInReportBuilder() {
    if (!result) return
    const params = new URLSearchParams({
      nlq: JSON.stringify(result.definition),
    })
    window.location.href = `/reports/new?${params.toString()}`
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input row */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => history.length > 0 && setShowHistory(true)}
            placeholder={placeholder}
            className="pl-9 pr-4"
            disabled={loading}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
          />
        </div>

        {history.length > 0 && (
          <Button
            variant="outline"
            size="icon"
            title="Query history"
            onClick={() => setShowHistory((v) => !v)}
          >
            <History className="h-4 w-4" />
          </Button>
        )}

        <Button onClick={() => void handleSubmit()} disabled={!question.trim() || loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Building your report...
            </>
          ) : locale === 'ar' ? (
            'بحث'
          ) : (
            'Ask AI'
          )}
        </Button>
      </div>

      {/* History dropdown */}
      {showHistory && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Recent queries</span>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowHistory(false)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {history.map((item, i) => (
              <li key={i}>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2 truncate"
                  onClick={() => selectHistory(item)}
                >
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 rotate-[-90deg]" />
                  <span className="truncate">{item}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Result card */}
      {result && (
        <Card className="mt-3 border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">
                {locale === 'ar' ? 'تفسير التقرير' : 'Report Explanation'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{result.explanation}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={openInReportBuilder}>
                <ExternalLink className="h-3 w-3 mr-1.5" />
                {locale === 'ar' ? 'فتح في منشئ التقارير' : 'Open in Report Builder'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setResult(null)
                  setQuestion('')
                }}
              >
                {locale === 'ar' ? 'مسح' : 'Clear'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default NLQBar
