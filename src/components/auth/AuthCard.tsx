import { cn } from '@/lib/utils'

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  )
}
