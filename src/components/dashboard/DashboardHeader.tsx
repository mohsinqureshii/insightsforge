'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit3,
  Eye,
  Share2,
  Download,
  Maximize2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardStore } from '@/stores/dashboard.store'
import { toast } from 'sonner'

export function DashboardHeader() {
  const { id, name, isEditMode, widgets, setEditMode, setFullscreen } = useDashboardStore()
  const [isSaving, setIsSaving] = useState(false)

  const handleToggleEditMode = async () => {
    if (isEditMode && id) {
      // Save on exit from edit mode
      setIsSaving(true)
      try {
        const res = await fetch(`/api/v1/dashboards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ widgets }),
        })
        if (!res.ok) {
          const json = await res.json()
          throw new Error(json.error ?? 'Failed to save dashboard')
        }
        toast.success('Dashboard saved')
        setEditMode(false)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save dashboard'
        toast.error(message)
      } finally {
        setIsSaving(false)
      }
    } else {
      setEditMode(!isEditMode)
    }
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Dashboard link copied to clipboard')
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }

  const handleExport = () => {
    toast.info('Export feature coming soon')
  }

  const handleFullscreen = () => {
    setFullscreen(true)
  }

  return (
    <header className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
      {/* Back arrow */}
      <Link href="/dashboards" className="shrink-0">
        <Button variant="ghost" size="icon" aria-label="Back to dashboards">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </Link>

      {/* Dashboard title */}
      <h1 className="text-lg font-semibold truncate flex-1">{name}</h1>

      {/* Action buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Edit / View mode toggle */}
        <Button
          variant={isEditMode ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggleEditMode}
          disabled={isSaving}
          aria-label={isEditMode ? 'Save and exit edit mode' : 'Enter edit mode'}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEditMode ? (
            <>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">View</span>
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </>
          )}
        </Button>

        {/* Share */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          aria-label="Share dashboard"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline">Share</span>
        </Button>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          aria-label="Export dashboard"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFullscreen}
          aria-label="Enter fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
