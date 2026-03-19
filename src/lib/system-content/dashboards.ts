// InsightForge – 10 System Dashboard Templates
// Pre-built dashboard layouts for common use cases

export interface DashboardWidgetTemplate {
  id: string
  title: string
  type: 'report' | 'metric' | 'text' | 'image'
  reportId: string | null    // references system report id
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
}

export interface DashboardTemplate {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  previewColor: string
  config: {
    theme?: 'light' | 'dark' | 'auto'
    refreshInterval?: number
    padding?: number
  }
  widgets: DashboardWidgetTemplate[]
}

export const SYSTEM_DASHBOARDS: DashboardTemplate[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Operations Overview – 12 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-001',
    name: 'Operations Overview',
    description: 'Complete operational snapshot: KPIs, work order charts, SLA gauge, and recent alert feed.',
    category: 'Operations',
    tags: ['operations', 'work-orders', 'sla', 'kpi'],
    previewColor: '#7c3aed',
    config: { theme: 'auto', refreshInterval: 300, padding: 16 },
    widgets: [
      // Row 1 – KPI strip (4 cards)
      {
        id: 'w1', title: 'Open Work Orders', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 0, y: 0, w: 3, h: 2 },
        config: { metricField: 'id', filterStatus: 'open', colorThreshold: { warn: 50, critical: 100 } },
      },
      {
        id: 'w2', title: 'SLA Compliance Rate', type: 'metric', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 3, y: 0, w: 3, h: 2 },
        config: { metricField: 'sla_met', format: '0.0%', invertThreshold: false },
      },
      {
        id: 'w3', title: 'Avg Resolution Time', type: 'metric', reportId: 'sys-rpt-005',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { metricField: 'resolution_time_hours', format: '0.1', suffix: ' hrs' },
      },
      {
        id: 'w4', title: 'Critical Alerts', type: 'metric', reportId: 'sys-rpt-014',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { filterSeverity: 'critical', colorThreshold: { warn: 5, critical: 15 } },
      },
      // Row 2 – Charts
      {
        id: 'w5', title: 'Work Orders by Status', type: 'report', reportId: 'sys-rpt-001',
        size: 'medium', position: { x: 0, y: 2, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w6', title: 'Monthly Volume Trend', type: 'report', reportId: 'sys-rpt-004',
        size: 'medium', position: { x: 6, y: 2, w: 6, h: 4 },
        config: {},
      },
      // Row 3
      {
        id: 'w7', title: 'Work Orders by Site', type: 'report', reportId: 'sys-rpt-003',
        size: 'medium', position: { x: 0, y: 6, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Priority Distribution', type: 'report', reportId: 'sys-rpt-007',
        size: 'small', position: { x: 4, y: 6, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w9', title: 'SLA Gauge', type: 'report', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 8, y: 6, w: 4, h: 4 },
        config: {},
      },
      // Row 4
      {
        id: 'w10', title: 'Alert Volume by Severity', type: 'report', reportId: 'sys-rpt-014',
        size: 'medium', position: { x: 0, y: 10, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w11', title: 'Technician Performance', type: 'report', reportId: 'sys-rpt-005',
        size: 'medium', position: { x: 8, y: 10, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w12', title: 'Open vs Closed', type: 'report', reportId: 'sys-rpt-006',
        size: 'small', position: { x: 0, y: 14, w: 4, h: 3 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Executive Summary – 8 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-002',
    name: 'Executive Summary',
    description: 'High-level executive view: revenue metrics, KPIs, trend lines, and SLA overview.',
    category: 'Executive',
    tags: ['executive', 'kpi', 'revenue', 'summary'],
    previewColor: '#1e40af',
    config: { theme: 'auto', refreshInterval: 900, padding: 20 },
    widgets: [
      {
        id: 'w1', title: 'Total Billing (MTD)', type: 'metric', reportId: 'sys-rpt-013',
        size: 'medium', position: { x: 0, y: 0, w: 3, h: 2 },
        config: { metricField: 'amount', aggregation: 'sum', format: '$0,0', prefix: 'AED ' },
      },
      {
        id: 'w2', title: 'SLA Compliance', type: 'metric', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 3, y: 0, w: 3, h: 2 },
        config: { metricField: 'sla_met', format: '0.0%' },
      },
      {
        id: 'w3', title: 'Work Orders (MTD)', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { metricField: 'id', aggregation: 'count' },
      },
      {
        id: 'w4', title: 'CSAT Score', type: 'metric', reportId: 'sys-rpt-020',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { metricField: 'score', format: '0.0', suffix: ' / 5' },
      },
      {
        id: 'w5', title: 'Monthly Work Order Trend', type: 'report', reportId: 'sys-rpt-004',
        size: 'large', position: { x: 0, y: 2, w: 8, h: 5 },
        config: {},
      },
      {
        id: 'w6', title: 'Priority Distribution', type: 'report', reportId: 'sys-rpt-007',
        size: 'medium', position: { x: 8, y: 2, w: 4, h: 5 },
        config: {},
      },
      {
        id: 'w7', title: 'Billing by Tenant', type: 'report', reportId: 'sys-rpt-013',
        size: 'medium', position: { x: 0, y: 7, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Customer Satisfaction', type: 'report', reportId: 'sys-rpt-020',
        size: 'medium', position: { x: 6, y: 7, w: 6, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. SLA Compliance Dashboard – 10 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-003',
    name: 'SLA Compliance Dashboard',
    description: 'Deep dive into SLA performance: compliance rate, breakdown by team and site, and 30-day trend.',
    category: 'SLA',
    tags: ['sla', 'compliance', 'performance', 'kpi'],
    previewColor: '#059669',
    config: { theme: 'auto', refreshInterval: 600, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Overall SLA Compliance', type: 'report', reportId: 'sys-rpt-002',
        size: 'medium', position: { x: 0, y: 0, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w2', title: 'SLA Met (Count)', type: 'metric', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 4, y: 0, w: 4, h: 2 },
        config: { metricField: 'sla_met', filterSlaStatus: true, format: '0,0' },
      },
      {
        id: 'w3', title: 'SLA Breached (Count)', type: 'metric', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 8, y: 0, w: 4, h: 2 },
        config: { metricField: 'sla_met', filterSlaStatus: false, format: '0,0' },
      },
      {
        id: 'w4', title: 'SLA Breach Rate', type: 'metric', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 4, y: 2, w: 4, h: 2 },
        config: { metricField: 'breach_rate', format: '0.0%', invertThreshold: true },
      },
      {
        id: 'w5', title: 'Avg Response Time', type: 'metric', reportId: 'sys-rpt-005',
        size: 'small', position: { x: 8, y: 2, w: 4, h: 2 },
        config: { metricField: 'resolution_time_hours', format: '0.1 hrs' },
      },
      {
        id: 'w6', title: 'SLA Trend (30d)', type: 'report', reportId: 'sys-rpt-004',
        size: 'large', position: { x: 0, y: 4, w: 8, h: 4 },
        config: { overrideChartType: 'line', metricField: 'sla_met' },
      },
      {
        id: 'w7', title: 'Compliance by Site', type: 'report', reportId: 'sys-rpt-003',
        size: 'medium', position: { x: 8, y: 4, w: 4, h: 4 },
        config: { metricField: 'sla_met' },
      },
      {
        id: 'w8', title: 'Technician SLA Performance', type: 'report', reportId: 'sys-rpt-005',
        size: 'large', position: { x: 0, y: 8, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w9', title: 'Resolution Time Distribution', type: 'report', reportId: 'sys-rpt-008',
        size: 'medium', position: { x: 6, y: 8, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w10', title: 'Team Workload', type: 'report', reportId: 'sys-rpt-018',
        size: 'medium', position: { x: 0, y: 12, w: 6, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Maintenance Dashboard – 10 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-004',
    name: 'Maintenance Dashboard',
    description: 'CMMS-focused view: work order volume, technician performance, asset status, and cost analysis.',
    category: 'Maintenance',
    tags: ['maintenance', 'cmms', 'work-orders', 'assets'],
    previewColor: '#d97706',
    config: { theme: 'auto', refreshInterval: 300, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Open WOs', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 0, y: 0, w: 3, h: 2 },
        config: { filterStatus: 'open' },
      },
      {
        id: 'w2', title: 'In Progress WOs', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 3, y: 0, w: 3, h: 2 },
        config: { filterStatus: 'in_progress' },
      },
      {
        id: 'w3', title: 'Completed Today', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { filterStatus: 'completed', filterPeriod: 'today' },
      },
      {
        id: 'w4', title: 'Overdue WOs', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { filterStatus: 'overdue', colorThreshold: { warn: 5, critical: 20 } },
      },
      {
        id: 'w5', title: 'Monthly WO Volume', type: 'report', reportId: 'sys-rpt-004',
        size: 'large', position: { x: 0, y: 2, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w6', title: 'WO by Status', type: 'report', reportId: 'sys-rpt-001',
        size: 'medium', position: { x: 8, y: 2, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w7', title: 'Technician Performance', type: 'report', reportId: 'sys-rpt-005',
        size: 'large', position: { x: 0, y: 6, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Priority Distribution', type: 'report', reportId: 'sys-rpt-007',
        size: 'medium', position: { x: 8, y: 6, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w9', title: 'Top 10 Problem Assets', type: 'report', reportId: 'sys-rpt-011',
        size: 'large', position: { x: 0, y: 10, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w10', title: 'Maintenance Cost by Category', type: 'report', reportId: 'sys-rpt-016',
        size: 'medium', position: { x: 6, y: 10, w: 6, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Access Control Dashboard – 8 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-005',
    name: 'Access Control Dashboard',
    description: 'Security-focused view: access events, visitor log, active alerts, and anomaly indicators.',
    category: 'Security',
    tags: ['access-control', 'security', 'visitors', 'alerts'],
    previewColor: '#dc2626',
    config: { theme: 'dark', refreshInterval: 60, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Access Events Today', type: 'metric', reportId: 'sys-rpt-009',
        size: 'small', position: { x: 0, y: 0, w: 3, h: 2 },
        config: { filterPeriod: 'today' },
      },
      {
        id: 'w2', title: 'Active Visitors', type: 'metric', reportId: 'sys-rpt-012',
        size: 'small', position: { x: 3, y: 0, w: 3, h: 2 },
        config: { filterActive: true },
      },
      {
        id: 'w3', title: 'Critical Alerts', type: 'metric', reportId: 'sys-rpt-014',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { filterSeverity: 'critical', colorThreshold: { warn: 1, critical: 5 } },
      },
      {
        id: 'w4', title: 'Denied Access (24h)', type: 'metric', reportId: 'sys-rpt-009',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { filterAccessType: 'denied', filterPeriod: '24h' },
      },
      {
        id: 'w5', title: 'Access Event Heatmap', type: 'report', reportId: 'sys-rpt-009',
        size: 'large', position: { x: 0, y: 2, w: 8, h: 5 },
        config: {},
      },
      {
        id: 'w6', title: 'Alert Volume by Severity', type: 'report', reportId: 'sys-rpt-014',
        size: 'medium', position: { x: 8, y: 2, w: 4, h: 5 },
        config: {},
      },
      {
        id: 'w7', title: 'Visitor Log', type: 'report', reportId: 'sys-rpt-012',
        size: 'large', position: { x: 0, y: 7, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Incident Response Funnel', type: 'report', reportId: 'sys-rpt-017',
        size: 'medium', position: { x: 8, y: 7, w: 4, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Power & Energy Dashboard – 6 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-006',
    name: 'Power & Energy Dashboard',
    description: 'Energy monitoring view: consumption trends by zone, cost breakdown, and peak usage periods.',
    category: 'Facilities',
    tags: ['energy', 'power', 'sustainability', 'iot'],
    previewColor: '#eab308',
    config: { theme: 'auto', refreshInterval: 300, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Total kWh Today', type: 'metric', reportId: 'sys-rpt-010',
        size: 'medium', position: { x: 0, y: 0, w: 4, h: 2 },
        config: { metricField: 'kw_consumed', aggregation: 'sum', filterPeriod: 'today', format: '0,0' },
      },
      {
        id: 'w2', title: 'Peak kW', type: 'metric', reportId: 'sys-rpt-010',
        size: 'small', position: { x: 4, y: 0, w: 4, h: 2 },
        config: { metricField: 'peak_kw', aggregation: 'max', format: '0,0' },
      },
      {
        id: 'w3', title: 'Active Zones', type: 'metric', reportId: 'sys-rpt-010',
        size: 'small', position: { x: 8, y: 0, w: 4, h: 2 },
        config: { metricField: 'zone', aggregation: 'distinct_count', format: '0' },
      },
      {
        id: 'w4', title: 'Power Consumption Trends', type: 'report', reportId: 'sys-rpt-010',
        size: 'full', position: { x: 0, y: 2, w: 12, h: 5 },
        config: {},
      },
      {
        id: 'w5', title: 'Consumption by Zone (Today)', type: 'report', reportId: 'sys-rpt-010',
        size: 'medium', position: { x: 0, y: 7, w: 6, h: 4 },
        config: { overrideChartType: 'pie', filterPeriod: 'today' },
      },
      {
        id: 'w6', title: 'Access Heatmap by Hour', type: 'report', reportId: 'sys-rpt-009',
        size: 'medium', position: { x: 6, y: 7, w: 6, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 7. Safety & Compliance – 8 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-007',
    name: 'Safety & Compliance',
    description: 'EHS dashboard: safety violations over time, incident funnel, compliance rate, and inspection status.',
    category: 'Safety',
    tags: ['safety', 'compliance', 'ehs', 'violations'],
    previewColor: '#16a34a',
    config: { theme: 'auto', refreshInterval: 600, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Open Violations', type: 'metric', reportId: 'sys-rpt-019',
        size: 'small', position: { x: 0, y: 0, w: 3, h: 2 },
        config: { metricField: 'new_violations', filterStatus: 'open', colorThreshold: { warn: 3, critical: 10 } },
      },
      {
        id: 'w2', title: 'Resolved This Month', type: 'metric', reportId: 'sys-rpt-019',
        size: 'small', position: { x: 3, y: 0, w: 3, h: 2 },
        config: { metricField: 'resolved_violations', filterPeriod: 'month' },
      },
      {
        id: 'w3', title: 'Compliance Rate', type: 'metric', reportId: 'sys-rpt-002',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { metricField: 'sla_met', format: '0.0%' },
      },
      {
        id: 'w4', title: 'Safety Score', type: 'metric', reportId: 'sys-rpt-020',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { metricField: 'score', format: '0.0' },
      },
      {
        id: 'w5', title: 'Violations Over Time', type: 'report', reportId: 'sys-rpt-019',
        size: 'large', position: { x: 0, y: 2, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w6', title: 'Incident Response Funnel', type: 'report', reportId: 'sys-rpt-017',
        size: 'medium', position: { x: 8, y: 2, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w7', title: 'Incidents by Priority', type: 'report', reportId: 'sys-rpt-007',
        size: 'medium', position: { x: 0, y: 6, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Team Workload (Safety)', type: 'report', reportId: 'sys-rpt-018',
        size: 'medium', position: { x: 6, y: 6, w: 6, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 8. Customer Portal Dashboard – 6 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-008',
    name: 'Customer Portal Dashboard',
    description: 'Tenant-facing view: my tickets, SLA status, CSAT score, and open issues.',
    category: 'Customer',
    tags: ['customer', 'portal', 'tickets', 'sla', 'csat'],
    previewColor: '#0891b2',
    config: { theme: 'light', refreshInterval: 120, padding: 20 },
    widgets: [
      {
        id: 'w1', title: 'My Open Tickets', type: 'metric', reportId: 'sys-rpt-006',
        size: 'medium', position: { x: 0, y: 0, w: 4, h: 2 },
        config: { filterOwner: '{{currentTenantId}}', filterState: 'open' },
      },
      {
        id: 'w2', title: 'SLA Compliance (My Tickets)', type: 'metric', reportId: 'sys-rpt-002',
        size: 'medium', position: { x: 4, y: 0, w: 4, h: 2 },
        config: { filterOwner: '{{currentTenantId}}', metricField: 'sla_met', format: '0.0%' },
      },
      {
        id: 'w3', title: 'My CSAT Score', type: 'metric', reportId: 'sys-rpt-020',
        size: 'medium', position: { x: 8, y: 0, w: 4, h: 2 },
        config: { filterOwner: '{{currentTenantId}}', metricField: 'score', format: '0.0' },
      },
      {
        id: 'w4', title: 'Ticket Status Overview', type: 'report', reportId: 'sys-rpt-006',
        size: 'medium', position: { x: 0, y: 2, w: 4, h: 4 },
        config: { filterOwner: '{{currentTenantId}}' },
      },
      {
        id: 'w5', title: 'Resolution Time (My Tickets)', type: 'report', reportId: 'sys-rpt-008',
        size: 'large', position: { x: 4, y: 2, w: 8, h: 4 },
        config: { filterOwner: '{{currentTenantId}}' },
      },
      {
        id: 'w6', title: 'Satisfaction Scores', type: 'report', reportId: 'sys-rpt-020',
        size: 'large', position: { x: 0, y: 6, w: 12, h: 4 },
        config: { filterOwner: '{{currentTenantId}}' },
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 9. IT Operations Dashboard – 8 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-009',
    name: 'IT Operations Dashboard',
    description: 'IT-ops view: system health gauges, incident tracking, resolution times, and alert trends.',
    category: 'IT',
    tags: ['it', 'infrastructure', 'incidents', 'monitoring'],
    previewColor: '#4f46e5',
    config: { theme: 'dark', refreshInterval: 60, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Critical System Uptime', type: 'report', reportId: 'sys-rpt-015',
        size: 'large', position: { x: 0, y: 0, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w2', title: 'Active Incidents', type: 'metric', reportId: 'sys-rpt-017',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { filterStage: 'active', colorThreshold: { warn: 3, critical: 10 } },
      },
      {
        id: 'w3', title: 'MTTR (hrs)', type: 'metric', reportId: 'sys-rpt-008',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { metricField: 'resolution_time_hours', format: '0.1' },
      },
      {
        id: 'w4', title: 'P1 Incidents', type: 'metric', reportId: 'sys-rpt-007',
        size: 'small', position: { x: 6, y: 2, w: 3, h: 2 },
        config: { filterPriority: 'critical', colorThreshold: { warn: 1, critical: 5 } },
      },
      {
        id: 'w5', title: 'Alert Volume (24h)', type: 'metric', reportId: 'sys-rpt-014',
        size: 'small', position: { x: 9, y: 2, w: 3, h: 2 },
        config: { filterPeriod: '24h' },
      },
      {
        id: 'w6', title: 'Alert Trends by Severity', type: 'report', reportId: 'sys-rpt-014',
        size: 'large', position: { x: 0, y: 4, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w7', title: 'Incident Response Funnel', type: 'report', reportId: 'sys-rpt-017',
        size: 'medium', position: { x: 8, y: 4, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Resolution Time by Category', type: 'report', reportId: 'sys-rpt-008',
        size: 'full', position: { x: 0, y: 8, w: 12, h: 4 },
        config: {},
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 10. Real Estate Operations – 10 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys-dash-010',
    name: 'Real Estate Operations',
    description: 'Property management view: occupancy by site, maintenance work orders, visitor traffic, and billing.',
    category: 'Real Estate',
    tags: ['real-estate', 'property', 'occupancy', 'facilities'],
    previewColor: '#0f766e',
    config: { theme: 'auto', refreshInterval: 600, padding: 16 },
    widgets: [
      {
        id: 'w1', title: 'Active Tenants', type: 'metric', reportId: 'sys-rpt-013',
        size: 'small', position: { x: 0, y: 0, w: 3, h: 2 },
        config: { metricField: 'tenant_id', aggregation: 'distinct_count' },
      },
      {
        id: 'w2', title: 'Visitors This Week', type: 'metric', reportId: 'sys-rpt-012',
        size: 'small', position: { x: 3, y: 0, w: 3, h: 2 },
        config: { filterPeriod: 'week' },
      },
      {
        id: 'w3', title: 'Open WOs', type: 'metric', reportId: 'sys-rpt-001',
        size: 'small', position: { x: 6, y: 0, w: 3, h: 2 },
        config: { filterStatus: 'open', colorThreshold: { warn: 20, critical: 50 } },
      },
      {
        id: 'w4', title: 'Billing Due (MTD)', type: 'metric', reportId: 'sys-rpt-013',
        size: 'small', position: { x: 9, y: 0, w: 3, h: 2 },
        config: { metricField: 'amount', aggregation: 'sum', filterStatus: 'pending', format: '$0,0' },
      },
      {
        id: 'w5', title: 'WO Volume by Site', type: 'report', reportId: 'sys-rpt-003',
        size: 'large', position: { x: 0, y: 2, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w6', title: 'Visitor Log Summary', type: 'report', reportId: 'sys-rpt-012',
        size: 'large', position: { x: 6, y: 2, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w7', title: 'Access Events Heatmap', type: 'report', reportId: 'sys-rpt-009',
        size: 'large', position: { x: 0, y: 6, w: 8, h: 4 },
        config: {},
      },
      {
        id: 'w8', title: 'Billing by Tenant', type: 'report', reportId: 'sys-rpt-013',
        size: 'medium', position: { x: 8, y: 6, w: 4, h: 4 },
        config: {},
      },
      {
        id: 'w9', title: 'Maintenance Cost by Category', type: 'report', reportId: 'sys-rpt-016',
        size: 'medium', position: { x: 0, y: 10, w: 6, h: 4 },
        config: {},
      },
      {
        id: 'w10', title: 'Power Consumption Trends', type: 'report', reportId: 'sys-rpt-010',
        size: 'medium', position: { x: 6, y: 10, w: 6, h: 4 },
        config: {},
      },
    ],
  },
]
