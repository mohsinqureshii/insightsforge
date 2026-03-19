'use client'

import { type WidgetConfig } from '@/stores/dashboard.store'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'

interface ImageWidgetProps {
  widget: WidgetConfig
}

export function ImageWidget({ widget }: ImageWidgetProps) {
  const src = widget.displayConfig.src as string | undefined
  const alt = (widget.displayConfig.alt as string) ?? widget.title ?? 'Image'
  const objectFit = (widget.displayConfig.objectFit as string) ?? 'contain'
  const href = widget.displayConfig.href as string | undefined

  if (!src) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
        <ImageIcon className="h-8 w-8" />
        <p className="text-xs">No image URL configured</p>
      </div>
    )
  }

  const imgElement = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-full"
      style={{ objectFit: objectFit as 'contain' | 'cover' | 'fill' | 'none' }}
    />
  )

  return (
    <div className="h-full w-full overflow-hidden">
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
          {imgElement}
        </a>
      ) : (
        imgElement
      )}
    </div>
  )
}
