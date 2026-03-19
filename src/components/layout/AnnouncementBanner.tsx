'use client'

import { useEffect, useState } from 'react'
import { X, Info, AlertTriangle, Sparkles, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Announcement {
  id: string
  title: string
  body: string
  type: 'info' | 'warning' | 'feature' | 'maintenance'
  ctaLabel?: string | null
  ctaUrl?: string | null
  isDismissible: boolean
}

const TYPE_CONFIG = {
  info: {
    bg: 'bg-blue-600',
    icon: Info,
  },
  warning: {
    bg: 'bg-amber-500',
    icon: AlertTriangle,
  },
  feature: {
    bg: 'bg-purple-600',
    icon: Sparkles,
  },
  maintenance: {
    bg: 'bg-gray-700',
    icon: Wrench,
  },
} as const

const DISMISSED_KEY = 'if_dismissed_announcements'

function getDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    setDismissed(getDismissed())
    fetch('/api/v1/announcements')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setAnnouncements(res.data)
        }
      })
      .catch(() => {})
  }, [])

  const visible = announcements.filter((a) => !dismissed.has(a.id))
  if (visible.length === 0) return null

  // Show only the most recent one at a time
  const current = visible[0]
  const config = TYPE_CONFIG[current.type]
  const Icon = config.icon

  const handleDismiss = () => {
    const next = new Set(dismissed)
    next.add(current.id)
    setDismissed(next)
    saveDismissed(next)

    // Also call dismiss API to persist server-side
    fetch('/api/v1/announcements/dismiss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcementId: current.id }),
    }).catch(() => {})
  }

  return (
    <div className={`${config.bg} text-white text-sm`}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <p className="flex-1 min-w-0">
          <span className="font-medium">{current.title}</span>
          {current.body && <span className="ml-2 opacity-90">{current.body}</span>}
          {current.ctaLabel && current.ctaUrl && (
            <a
              href={current.ctaUrl}
              className="ml-3 underline underline-offset-2 font-medium hover:opacity-80"
              target="_blank"
              rel="noopener noreferrer"
            >
              {current.ctaLabel} →
            </a>
          )}
        </p>
        {visible.length > 1 && (
          <span className="text-xs opacity-70">{visible.length} announcements</span>
        )}
        {current.isDismissible && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-white/20 text-white"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
