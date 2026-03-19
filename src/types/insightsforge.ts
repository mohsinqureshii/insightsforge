// InsightForge – Shared TypeScript Types

// ============================================================
// ENUMS (mirroring Prisma enums)
// ============================================================

export type Plan = 'starter' | 'business' | 'enterprise'
export type Role = 'super_admin' | 'tenant_admin' | 'analytics_admin' | 'builder' | 'viewer' | 'api_user'
export type ConnectorType =
  | 'postgresql'
  | 'mysql'
  | 'mssql'
  | 'bigquery'
  | 'snowflake'
  | 'redshift'
  | 'mongodb'
  | 'clickhouse'
  | 'sqlite'
  | 'csv_upload'
  | 'rest_api'
  | 'google_sheets'
  | 'centre3'
  | 'opssense'

export type ReportType = 'table' | 'chart' | 'metric' | 'pivot' | 'funnel' | 'cohort' | 'custom_sql'
export type ChartType =
  | 'bar'
  | 'line'
  | 'area'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'treemap'
  | 'funnel'
  | 'gauge'
  | 'sankey'
  | 'radar'

export type WidgetSize = 'small' | 'medium' | 'large' | 'full'
export type Visibility = 'private' | 'tenant' | 'public' | 'shared_link'
export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron'
export type DeliveryChannel = 'email' | 'slack' | 'webhook' | 's3'
export type DeliveryStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped'
export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
export type TenantStatus = 'active' | 'suspended' | 'cancelled' | 'trial'
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

// ============================================================
// API RESPONSE WRAPPER
// ============================================================

export interface ApiResponse<T = undefined> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

// ============================================================
// USER & AUTH
// ============================================================

export interface AuthUser {
  id: string
  email: string
  name: string | null
  image: string | null
  mfaEnabled: boolean
  tenants: TenantMembership[]
}

export interface TenantMembership {
  tenantId: string
  tenantName: string
  tenantSlug: string
  role: Role
}

export interface SessionUser extends AuthUser {
  activeTenantId?: string
  activeRole?: Role
}

// ============================================================
// TENANT
// ============================================================

export interface TenantSettings {
  timezone: string
  locale: string
  dateFormat: string
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  logoUrl?: string
  allowPublicDashboards: boolean
  requireMfa: boolean
  allowedDomains: string[]
  dataRetentionDays: number
}

export interface TenantWithSettings {
  id: string
  name: string
  slug: string
  plan: Plan
  status: TenantStatus
  logoUrl: string | null
  domain: string | null
  maxUsers: number
  maxSources: number
  maxReports: number
  settings: TenantSettings
  trialEndsAt: Date | null
  createdAt: Date
}

export interface TenantUser {
  id: string
  tenantId: string
  userId: string
  role: Role
  inviteStatus: InviteStatus
  joinedAt: Date | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
    lastLoginAt: Date | null
    mfaEnabled: boolean
  }
}

// ============================================================
// DATA SOURCES
// ============================================================

export interface DataSourceConfig {
  // Common
  host?: string
  port?: number
  database?: string
  username?: string
  password?: string
  ssl?: boolean
  sslCert?: string

  // BigQuery
  projectId?: string
  keyFile?: string

  // Snowflake
  account?: string
  warehouse?: string

  // REST API
  baseUrl?: string
  authType?: 'none' | 'bearer' | 'basic' | 'api_key'
  authHeader?: string
  authValue?: string

  // Google Sheets
  spreadsheetId?: string
  sheetName?: string
  serviceAccount?: string

  // S3/CSV
  bucket?: string
  prefix?: string
  region?: string
}

export interface DataSource {
  id: string
  tenantId: string
  name: string
  description: string | null
  type: ConnectorType
  isActive: boolean
  lastTestedAt: Date | null
  lastSyncAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  schema?: DatabaseSchema
}

export interface DatabaseSchema {
  tables: SchemaTable[]
  lastFetched: string
}

export interface SchemaTable {
  name: string
  schema?: string
  columns: SchemaColumn[]
  rowCount?: number
}

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  isForeignKey: boolean
  defaultValue?: string
}

// ============================================================
// REPORTS
// ============================================================

export interface ReportConfig {
  columns: ReportColumn[]
  filters: ReportFilter[]
  sorts: ReportSort[]
  limit?: number
  offset?: number
  groupBy?: string[]
  aggregations?: Aggregation[]
  chartConfig?: ChartConfig
  formatting?: FormattingRule[]
}

export interface ReportColumn {
  id: string
  field: string
  label: string
  type: 'string' | 'number' | 'date' | 'boolean'
  width?: number
  hidden?: boolean
  format?: string
  align?: 'left' | 'center' | 'right'
}

export interface ReportFilter {
  id: string
  field: string
  operator: FilterOperator
  value: unknown
  type: 'string' | 'number' | 'date' | 'boolean'
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in'
  | 'between'

export interface ReportSort {
  field: string
  direction: 'asc' | 'desc'
}

export interface Aggregation {
  field: string
  function: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count'
  alias?: string
}

export interface ChartConfig {
  type: ChartType
  xAxis?: AxisConfig
  yAxis?: AxisConfig
  series?: SeriesConfig[]
  legend?: boolean
  tooltip?: boolean
  smooth?: boolean
  stack?: boolean
  colors?: string[]
  padding?: [number, number, number, number]
}

export interface AxisConfig {
  field: string
  label?: string
  type?: 'category' | 'value' | 'time'
  format?: string
}

export interface SeriesConfig {
  name: string
  field: string
  type?: ChartType
  color?: string
}

export interface FormattingRule {
  field: string
  condition: FilterOperator
  value: unknown
  style: {
    color?: string
    background?: string
    fontWeight?: string
    icon?: string
  }
}

export interface Report {
  id: string
  tenantId: string
  dataSourceId: string | null
  folderId: string | null
  name: string
  description: string | null
  type: ReportType
  chartType: ChartType | null
  query: string | null
  config: ReportConfig
  visibility: Visibility
  isFeatured: boolean
  viewCount: number
  createdBy: string
  lastRunAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================================
// DASHBOARDS
// ============================================================

export interface DashboardConfig {
  theme?: 'light' | 'dark' | 'auto'
  refreshInterval?: number // seconds, 0 = no auto-refresh
  globalFilters?: ReportFilter[]
  padding?: number
}

export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export interface DashboardWidget {
  id: string
  dashboardId: string
  reportId: string | null
  title: string | null
  type: 'report' | 'metric' | 'text' | 'image' | 'embed'
  size: WidgetSize
  position: WidgetPosition
  config: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface Dashboard {
  id: string
  tenantId: string
  folderId: string | null
  name: string
  description: string | null
  layout: WidgetPosition[]
  config: DashboardConfig
  visibility: Visibility
  isFeatured: boolean
  viewCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
  widgets?: DashboardWidget[]
}

// ============================================================
// API KEYS
// ============================================================

export interface ApiKey {
  id: string
  tenantId: string
  userId: string
  name: string
  keyPrefix: string
  scopes: ApiKeyScope[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  isActive: boolean
  createdAt: Date
}

export type ApiKeyScope =
  | 'reports:read'
  | 'reports:write'
  | 'dashboards:read'
  | 'dashboards:write'
  | 'data_sources:read'
  | 'data_sources:write'
  | 'users:read'
  | 'users:write'
  | 'exports:download'
  | 'queries:execute'

// ============================================================
// RBAC
// ============================================================

export const ROLE_HIERARCHY: Record<Role, number> = {
  super_admin: 100,
  tenant_admin: 80,
  analytics_admin: 60,
  builder: 40,
  viewer: 20,
  api_user: 10,
}

export const PERMISSIONS = {
  // Data Sources
  DATA_SOURCE_CREATE: ['tenant_admin', 'analytics_admin'] as Role[],
  DATA_SOURCE_READ: ['tenant_admin', 'analytics_admin', 'builder', 'viewer'] as Role[],
  DATA_SOURCE_UPDATE: ['tenant_admin', 'analytics_admin'] as Role[],
  DATA_SOURCE_DELETE: ['tenant_admin', 'analytics_admin'] as Role[],

  // Reports
  REPORT_CREATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  REPORT_READ: ['tenant_admin', 'analytics_admin', 'builder', 'viewer'] as Role[],
  REPORT_UPDATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  REPORT_DELETE: ['tenant_admin', 'analytics_admin'] as Role[],
  REPORT_SHARE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],

  // Dashboards
  DASHBOARD_CREATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  DASHBOARD_READ: ['tenant_admin', 'analytics_admin', 'builder', 'viewer'] as Role[],
  DASHBOARD_UPDATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  DASHBOARD_DELETE: ['tenant_admin', 'analytics_admin'] as Role[],
  DASHBOARD_SHARE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],

  // Users & Team
  USER_INVITE: ['tenant_admin'] as Role[],
  USER_REMOVE: ['tenant_admin'] as Role[],
  USER_ROLE_CHANGE: ['tenant_admin'] as Role[],
  USER_READ: ['tenant_admin', 'analytics_admin'] as Role[],

  // Settings
  SETTINGS_READ: ['tenant_admin', 'analytics_admin'] as Role[],
  SETTINGS_UPDATE: ['tenant_admin'] as Role[],

  // API Keys
  API_KEY_CREATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  API_KEY_READ: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  API_KEY_REVOKE: ['tenant_admin'] as Role[],

  // Audit
  AUDIT_LOG_READ: ['tenant_admin', 'analytics_admin'] as Role[],

  // Schedules
  SCHEDULE_CREATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  SCHEDULE_READ: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  SCHEDULE_UPDATE: ['tenant_admin', 'analytics_admin', 'builder'] as Role[],
  SCHEDULE_DELETE: ['tenant_admin', 'analytics_admin'] as Role[],
} as const

export type Permission = keyof typeof PERMISSIONS

// ============================================================
// QUERY EXECUTION
// ============================================================

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
  truncated: boolean
}

export interface QueryJob {
  id: string
  tenantId: string
  userId: string
  dataSourceId: string | null
  reportId: string | null
  query: string
  status: JobStatus
  resultKey: string | null
  rowCount: number | null
  durationMs: number | null
  error: string | null
  queuedAt: Date
  startedAt: Date | null
  completedAt: Date | null
}

// ============================================================
// FOLDER
// ============================================================

export interface Folder {
  id: string
  tenantId: string
  parentId: string | null
  name: string
  description: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  children?: Folder[]
  reports?: Pick<Report, 'id' | 'name' | 'type'>[]
  dashboards?: Pick<Dashboard, 'id' | 'name'>[]
}

// ============================================================
// SHARING
// ============================================================

export interface Share {
  id: string
  tenantId: string
  token: string
  reportId: string | null
  dashboardId: string | null
  createdBy: string
  expiresAt: Date | null
  viewCount: number
  isActive: boolean
  allowDownload: boolean
  createdAt: Date
}

// ============================================================
// SCHEDULES
// ============================================================

export interface Schedule {
  id: string
  tenantId: string
  reportId: string | null
  dashboardId: string | null
  name: string
  frequency: ScheduleFrequency
  cronExpr: string | null
  timezone: string
  channel: DeliveryChannel
  recipients: ScheduleRecipient[]
  config: ScheduleConfig
  isActive: boolean
  lastRunAt: Date | null
  nextRunAt: Date | null
  createdBy: string
  createdAt: Date
}

export interface ScheduleRecipient {
  type: 'email' | 'slack_webhook' | 'url'
  value: string
  name?: string
}

export interface ScheduleConfig {
  format?: 'pdf' | 'png' | 'csv' | 'xlsx'
  subject?: string
  message?: string
  includeFilters?: boolean
}

// ============================================================
// AUDIT LOG
// ============================================================

export interface AuditLogEntry {
  id: string
  tenantId: string | null
  userId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown>
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  user?: {
    name: string | null
    email: string
  }
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type SortDirection = 'asc' | 'desc'

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: SortDirection
}

export interface SearchParams extends PaginationParams {
  q?: string
  tenantId?: string
}

export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
export type UpdateInput<T> = Partial<CreateInput<T>>

export interface FileUpload {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  size: number
  buffer?: Buffer
  key?: string // S3 key after upload
  url?: string // presigned URL
}

// ============================================================
// NEXT AUTH EXTENSION
// ============================================================

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string | null
      image: string | null
      mfaEnabled: boolean
    }
    activeTenantId?: string
    activeRole?: Role
  }

  interface User {
    id: string
    email: string
    name: string | null
    image: string | null
    mfaEnabled: boolean
    passwordHash?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    mfaEnabled: boolean
    mfaVerified?: boolean
    activeTenantId?: string
    activeRole?: Role
  }
}
