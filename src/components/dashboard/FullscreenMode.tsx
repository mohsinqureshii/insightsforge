'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardStore } from '@/stores/dashboard.store'

interface FullscreenModeProps {
  children: React.ReactNode
}

export function FullscreenMode({ children }: FullscreenModeProps) {
  const { isFullscreen, setFullscreen } = useDashboardStore()

  // Allow Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, setFullscreen])

  if (!isFullscreen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background dark:bg-background overflow-auto">
      {/* Exit button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFullscreen(false)}
          aria-label="Exit fullscreen"
          className="shadow-md"
        >
          <X className="h-4 w-4" />
          <span className="ml-1">Exit Fullscreen</span>
        </Button>
      </div>

      {/* Dashboard content */}
      <div className="w-full h-full overflow-auto p-4 pt-16">
        {children}
      </div>
    </div>
  )
}
