'use client'

import { type WidgetConfig } from '@/stores/dashboard.store'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface TextWidgetProps {
  widget: WidgetConfig
}

export function TextWidget({ widget }: TextWidgetProps) {
  const content = (widget.displayConfig.content as string) ?? '*No content configured*'
  const align = (widget.displayConfig.align as 'left' | 'center' | 'right') ?? 'left'
  const fontSize = (widget.displayConfig.fontSize as string) ?? 'sm'

  const fontSizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontSize] ?? 'text-sm'

  return (
    <div
      className={cn(
        'h-full overflow-auto p-4',
        fontSizeClass,
        align === 'center' && 'text-center',
        align === 'right' && 'text-right',
      )}
    >
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
