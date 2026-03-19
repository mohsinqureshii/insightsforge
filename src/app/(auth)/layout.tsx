import type { Metadata } from 'next'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export const metadata: Metadata = {
  title: {
    default: 'Authentication',
    template: '%s | InsightForge',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/30 to-purple-50/20 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      {/* Header */}
      <header className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold">InsightForge</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  )
}
