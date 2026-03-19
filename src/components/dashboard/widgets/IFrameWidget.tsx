'use client'

import { useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { type WidgetConfig } from '@/stores/dashboard.store'

interface IFrameWidgetProps {
  widget: WidgetConfig
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function IFrameWidget({ widget }: IFrameWidgetProps) {
  const url = widget.displayConfig.url as string | undefined

  const validationError = useMemo<string | null>(() => {
    if (!url || url.trim() === '') return 'No URL configured for this widget.'
    if (!isValidUrl(url)) return 'Invalid URL. Please provide a valid http or https URL.'
    return null
  }, [url])

  if (validationError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{validationError}</p>
      </div>
    )
  }

  return (
    <iframe
      src={url}
      title={widget.titleOverride ?? widget.title ?? 'Embedded content'}
      className="w-full h-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  )
}
