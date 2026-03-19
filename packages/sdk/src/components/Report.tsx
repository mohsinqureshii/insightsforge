'use client'
import React, { useEffect, useRef } from 'react'
import type { ReportProps } from '../types'
import { InsightForge } from '../InsightForge'

export function Report({
  id,
  height = '500px',
  displayMode = 'table',
  filters,
  className,
}: ReportProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const config = InsightForge.getConfig()
    const token = InsightForge.getToken()
    const baseUrl = config.baseUrl ?? 'https://app.insightforge.io'

    const iframe = document.createElement('iframe')
    const params = new URLSearchParams({
      sdk: '1',
      token: token.token,
      locale: config.locale ?? 'en',
      displayMode,
      ...(filters ? { filters: JSON.stringify(filters) } : {}),
    })
    if (config.theme) {
      params.set('theme', JSON.stringify(config.theme))
    }
    iframe.src = `${baseUrl}/embed/report/${id}?${params.toString()}`
    iframe.style.width = '100%'
    iframe.style.height = typeof height === 'number' ? `${height}px` : height
    iframe.style.border = 'none'
    iframe.style.borderRadius = config.theme?.borderRadius ?? '8px'
    iframe.allow = 'fullscreen'
    iframe.title = `InsightForge Report ${id}`

    // postMessage bridge
    const messageHandler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return
      const msg = event.data as Record<string, unknown>
      if (msg?.type === 'IF_NAVIGATE' && config.onNavigate) {
        config.onNavigate(msg.payload as Parameters<typeof config.onNavigate>[0])
      }
      if (msg?.type === 'IF_HEIGHT_CHANGE') {
        iframe.style.height = `${msg.height as number}px`
      }
      if (msg?.type === 'IF_ERROR' && config.onError) {
        config.onError(msg.error as Parameters<typeof config.onError>[0])
      }
    }

    window.addEventListener('message', messageHandler)
    containerRef.current?.appendChild(iframe)

    return () => {
      window.removeEventListener('message', messageHandler)
      iframe.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, height, displayMode, JSON.stringify(filters)])

  return <div ref={containerRef} className={className} style={{ width: '100%' }} />
}
