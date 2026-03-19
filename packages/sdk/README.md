# @insightforge/sdk

Embed InsightForge dashboards and reports natively in any web application.

## Installation

```bash
npm install @insightforge/sdk
```

## Quick Start

```tsx
import { InsightForge, Dashboard } from '@insightforge/sdk'

// In your app bootstrap (run once):
await InsightForge.init({
  tenantId: 'your-tenant-id',
  apiKey: process.env.INSIGHTFORGE_API_KEY,
  userId: currentUser.id,
  userRole: currentUser.insightForgeRole,
  theme: {
    primaryColour: '#5B0EA6',
    fontFamily: 'Inter, sans-serif',
  },
  dataFilters: {
    site_id: currentUser.siteId,
  },
  onNavigate: (event) => {
    // Handle record navigation events from InsightForge
    router.push(event.url)
  },
})

// In your component:
export function AnalyticsPage() {
  return <Dashboard id="dash_operations_overview" height="800px" />
}
```

## API Reference

### `InsightForge.init(config)`

Initialises the SDK. Must be called once before rendering any embed components.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tenantId` | `string` | Yes | Your InsightForge tenant ID |
| `apiKey` | `string` | Yes | API key with `sdk` scope |
| `userId` | `string` | Yes | ID of the currently authenticated user in the host app |
| `userRole` | `string` | Yes | InsightForge role to assign: `tenant_admin`, `analytics_admin`, `builder`, `viewer`, or `api_user` |
| `baseUrl` | `string` | No | Override the InsightForge base URL (defaults to `https://app.insightforge.io`) |
| `theme` | `InsightForgeTheme` | No | White-label theme options |
| `dataFilters` | `Record<string, ...>` | No | Row-level security filters applied to all queries |
| `locale` | `'en' \| 'ar'` | No | UI locale (default: `en`) |
| `onNavigate` | `function` | No | Callback fired when a user navigates to a record inside InsightForge |
| `onError` | `function` | No | Callback fired on SDK errors |

### `<Dashboard id="..." />`

Embeds a single dashboard.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | Dashboard ID |
| `height` | `string \| number` | `'600px'` | Iframe height |
| `filters` | `Record<string, unknown>` | — | Dashboard-level filters |
| `onFilterChange` | `function` | — | Callback fired when user changes filters inside the embed |
| `className` | `string` | — | CSS class applied to the wrapper `<div>` |

### `<Report id="..." />`

Embeds a single report.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | — | Report ID |
| `height` | `string \| number` | `'500px'` | Iframe height |
| `displayMode` | `'table' \| 'chart' \| 'kpi'` | `'table'` | Override the report display mode |
| `filters` | `Record<string, unknown>` | — | Report-level filters |
| `className` | `string` | — | CSS class applied to the wrapper `<div>` |

### `<App section="..." />`

Embeds the full InsightForge application shell.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `section` | `string` | `'my-dashboards'` | Initial section to display: `my-dashboards`, `reports`, `data-sources`, or `schedules` |
| `height` | `string \| number` | `'100vh'` | Iframe height |
| `className` | `string` | — | CSS class applied to the wrapper `<div>` |

### Web Component

For non-React host applications, use the `<insightforge-dashboard>` custom element:

```html
<script type="module" src="@insightforge/sdk/dist/index.esm.js"></script>
<insightforge-dashboard
  dashboard-id="dash_operations_overview"
  token="eyJ..."
  base-url="https://app.insightforge.io"
  height="600px"
  locale="en"
></insightforge-dashboard>
```

Listen for postMessage events via the `if-message` custom DOM event:

```js
document.querySelector('insightforge-dashboard').addEventListener('if-message', (e) => {
  console.log(e.detail) // IFMessageEvent
})
```

### Theme Options (`InsightForgeTheme`)

| Property | Type | Description |
|----------|------|-------------|
| `primaryColour` | `string` | Primary brand colour (CSS colour value) |
| `fontFamily` | `string` | Font family string (e.g. `'Inter, sans-serif'`) |
| `borderRadius` | `string` | Border radius for cards and panels (e.g. `'8px'`) |
| `darkMode` | `boolean` | Force dark or light mode |

### postMessage Event Types (`IFMessageEvent`)

| Type | Payload | Description |
|------|---------|-------------|
| `IF_READY` | `{ tenantId }` | Embed has loaded and is ready |
| `IF_NAVIGATE` | `{ payload: NavigationEvent }` | User navigated to a linked record |
| `IF_FILTER_CHANGE` | `{ filters }` | User changed dashboard filters |
| `IF_ERROR` | `{ error: SDKError }` | An error occurred inside the embed |
| `IF_HEIGHT_CHANGE` | `{ height: number }` | Embed content height changed (for auto-sizing) |

## Security

- The `apiKey` should be kept server-side and the SDK should be initialised via a backend-for-frontend (BFF) pattern to avoid exposing it in the browser.
- The SDK exchanges your API key for a short-lived JWT (1 hour TTL). All iframe URLs are signed with this token.
- `dataFilters` are embedded in the signed JWT and enforced server-side — they cannot be tampered with by end users.

## TypeScript

Full TypeScript definitions are included. Import types directly:

```ts
import type { InsightForgeConfig, InsightForgeTheme, IFMessageEvent } from '@insightforge/sdk'
```
