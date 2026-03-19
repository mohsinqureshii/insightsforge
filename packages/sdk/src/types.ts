export type InsightForgeConfig = {
  tenantId: string
  apiKey: string
  userId: string
  userRole: 'tenant_admin' | 'analytics_admin' | 'builder' | 'viewer' | 'api_user'
  baseUrl?: string           // Defaults to https://app.insightforge.io
  theme?: InsightForgeTheme
  dataFilters?: Record<string, string | string[] | number | boolean>
  locale?: 'en' | 'ar'
  onNavigate?: (event: NavigationEvent) => void
  onError?: (error: SDKError) => void
}

export type InsightForgeTheme = {
  primaryColour?: string
  fontFamily?: string
  borderRadius?: string
  darkMode?: boolean
}

export type DashboardProps = {
  id: string
  height?: string | number
  filters?: Record<string, unknown>
  onFilterChange?: (filters: Record<string, unknown>) => void
  className?: string
}

export type ReportProps = {
  id: string
  height?: string | number
  displayMode?: 'table' | 'chart' | 'kpi'
  filters?: Record<string, unknown>
  className?: string
}

export type AppProps = {
  section?: 'my-dashboards' | 'reports' | 'data-sources' | 'schedules'
  height?: string | number
  className?: string
}

export type NavigationEvent = {
  type: 'record_navigation'
  resourceType: string
  resourceId: string
  url: string
}

export type SDKError = {
  code: string
  message: string
  details?: unknown
}

export type SDKToken = {
  token: string
  expiresAt: string
}

// postMessage event types
export type IFMessageEvent =
  | { type: 'IF_READY'; tenantId: string }
  | { type: 'IF_NAVIGATE'; payload: NavigationEvent }
  | { type: 'IF_FILTER_CHANGE'; filters: Record<string, unknown> }
  | { type: 'IF_ERROR'; error: SDKError }
  | { type: 'IF_HEIGHT_CHANGE'; height: number }
