// Embed route: /embed/dashboard/[id]
//
// Rendered when the @insightforge/sdk Dashboard component creates an iframe.
// Query params:
//   sdk=1          — identifies this as an SDK-mode request
//   token=<jwt>    — short-lived SDK JWT issued by /api/auth/sdk-token
//   locale=en|ar   — UI locale
//   filters=<json> — optional JSON-encoded filter overrides
//   theme=<json>   — optional JSON-encoded InsightForgeTheme

import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { verifyJwt } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

type SdkJwtPayload = {
  sub: string
  tenantId: string
  role: string
  dataFilters: Record<string, unknown>
  locale: string
  iss: string
  exp: number
}

type EmbedDashboardPageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmbedDashboardPage({
  params,
  searchParams,
}: EmbedDashboardPageProps) {
  const { id } = await params
  const query = await searchParams

  // This route is only reachable in SDK mode
  if (query.sdk !== '1') {
    redirect('/')
  }

  const rawToken = typeof query.token === 'string' ? query.token : null
  if (!rawToken) {
    return (
      <EmbedError message="Missing SDK token. Please re-initialise the InsightForge SDK." />
    )
  }

  // Validate the SDK JWT
  const payload = verifyJwt<SdkJwtPayload>(rawToken)
  if (!payload || payload.iss !== 'insightforge-sdk') {
    return <EmbedError message="Invalid or expired SDK token." />
  }

  // Fetch the dashboard, scoped to the tenant from the JWT
  const dashboard = await prisma.ifDashboard.findFirst({
    where: {
      id,
      tenantId: payload.tenantId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      description: true,
      layout: true,
      config: true,
      widgets: {
        select: {
          id: true,
          reportId: true,
          title: true,
          type: true,
          size: true,
          position: true,
          config: true,
        },
      },
    },
  })

  if (!dashboard) {
    notFound()
  }

  // Parse optional query params
  const locale = typeof query.locale === 'string' ? query.locale : 'en'
  const filtersRaw = typeof query.filters === 'string' ? query.filters : null
  const themeRaw = typeof query.theme === 'string' ? query.theme : null

  let filters: Record<string, unknown> = {}
  if (filtersRaw) {
    try {
      filters = JSON.parse(filtersRaw) as Record<string, unknown>
    } catch {
      // Ignore malformed filter JSON — use empty filters
    }
  }

  let theme: Record<string, unknown> = {}
  if (themeRaw) {
    try {
      theme = JSON.parse(themeRaw) as Record<string, unknown>
    } catch {
      // Ignore malformed theme JSON — use defaults
    }
  }

  // Merge JWT data-filters with per-embed filters (JWT data-filters take precedence
  // to prevent end-user circumvention of row-level security)
  const mergedFilters = { ...filters, ...payload.dataFilters }

  return (
    <EmbedDashboardCanvas
      dashboard={dashboard}
      userId={payload.sub}
      role={payload.role}
      tenantId={payload.tenantId}
      locale={locale}
      filters={mergedFilters}
      theme={theme}
    />
  )
}

// ---------------------------------------------------------------------------
// Sub-components (server-rendered kiosk view of the dashboard)
// ---------------------------------------------------------------------------

type DashboardShape = {
  id: string
  name: string
  description: string | null
  layout: unknown
  config: unknown
  widgets: Array<{
    id: string
    reportId: string | null
    title: string | null
    type: string
    size: string
    position: unknown
    config: unknown
  }>
}

type EmbedDashboardCanvasProps = {
  dashboard: DashboardShape
  userId: string
  role: string
  tenantId: string
  locale: string
  filters: Record<string, unknown>
  theme: Record<string, unknown>
}

function EmbedDashboardCanvas({
  dashboard,
  role,
  locale,
  filters,
  theme,
}: EmbedDashboardCanvasProps) {
  const borderRadius =
    typeof theme.borderRadius === 'string' ? theme.borderRadius : '8px'
  const fontFamily =
    typeof theme.fontFamily === 'string' ? theme.fontFamily : 'inherit'
  const primaryColour =
    typeof theme.primaryColour === 'string' ? theme.primaryColour : undefined
  const darkMode = theme.darkMode === true

  return (
    <div
      className={`h-full w-full overflow-auto p-4 ${darkMode ? 'dark' : ''}`}
      style={
        {
          fontFamily,
          '--if-primary': primaryColour,
          '--if-border-radius': borderRadius,
        } as React.CSSProperties
      }
      data-locale={locale}
      data-embed="dashboard"
      data-filters={JSON.stringify(filters)}
    >
      {/* Kiosk header — minimal branding strip */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-foreground">{dashboard.name}</h1>
        {dashboard.description && (
          <p className="mt-1 text-sm text-muted-foreground">{dashboard.description}</p>
        )}
      </div>

      {/* Widget grid placeholder — in a full implementation this would render
          the react-grid-layout canvas with each widget's report data */}
      <div className="grid grid-cols-12 gap-4">
        {dashboard.widgets.map((widget) => (
          <div
            key={widget.id}
            className="col-span-12 rounded-lg border bg-card p-4 text-card-foreground shadow-sm sm:col-span-6 lg:col-span-4"
            style={{ borderRadius }}
            data-widget-id={widget.id}
            data-widget-type={widget.type}
          >
            <div className="mb-2 text-sm font-medium text-muted-foreground">
              {widget.title ?? 'Untitled Widget'}
            </div>
            <div className="h-32 animate-pulse rounded bg-muted" aria-label="Loading widget data" />
          </div>
        ))}

        {dashboard.widgets.length === 0 && (
          <div className="col-span-12 flex items-center justify-center rounded-lg border border-dashed bg-muted/30 py-16 text-muted-foreground">
            This dashboard has no widgets.
          </div>
        )}
      </div>

      {/* Role and access context injected for client-side hydration */}
      <script
        type="application/json"
        id="if-embed-context"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            dashboardId: dashboard.id,
            role,
            locale,
          }),
        }}
      />
    </div>
  )
}

function EmbedError({ message }: { message: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-8 text-center">
      <div>
        <p className="text-sm font-medium text-destructive">Embed Error</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}
