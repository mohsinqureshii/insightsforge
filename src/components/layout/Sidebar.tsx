'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Database,
  FolderOpen,
  Home,
  Key,
  LayoutDashboard,
  Settings,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  badge?: string
}

const mainNavItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: Home },
  { label: 'Dashboards', href: '/dashboard/dashboards', icon: LayoutDashboard },
  { label: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { label: 'Data Sources', href: '/dashboard/data-sources', icon: Database },
  { label: 'Folders', href: '/dashboard/folders', icon: FolderOpen },
  { label: 'Favourites', href: '/dashboard/favourites', icon: Star },
]

const settingsNavItems: NavItem[] = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Team', href: '/dashboard/settings/team', icon: Users },
  { label: 'API Keys', href: '/dashboard/settings/api-keys', icon: Key },
]

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
        isActive
          ? 'bg-sidebar-accent text-sidebar-primary'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
      {item.badge && (
        <span className="ml-auto rounded-full bg-primary-600/20 px-2 py-0.5 text-xs text-primary-400">
          {item.badge}
        </span>
      )}
    </Link>
  )
}

interface SidebarProps {
  tenantName?: string
  tenantSlug?: string
}

export function Sidebar({ tenantName = 'My Organization', tenantSlug }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{tenantName}</p>
          {tenantSlug && (
            <p className="truncate text-xs text-sidebar-foreground/50">{tenantSlug}.insightsforge.io</p>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        <div className="mt-6">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Settings
          </p>
          <div className="space-y-1">
            {settingsNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="rounded-lg bg-sidebar-accent/50 p-3 text-xs text-sidebar-foreground/60">
          <p className="font-medium text-sidebar-foreground/80">InsightForge</p>
          <p>v1.0.0 · Starter Plan</p>
        </div>
      </div>
    </aside>
  )
}
