// InsightForge – 10 Dashboard Template Definitions
// Pre-built dashboard layouts for common use cases

export type DashboardCategory = 'operations' | 'executive' | 'security' | 'it' | 'hr'

export interface DashboardWidgetTemplate {
  id: string
  title: string
  type: 'report' | 'metric' | 'text' | 'image'
  reportId: string | null
  size: 'small' | 'medium' | 'large' | 'full'
  position: { x: number; y: number; w: number; h: number }
  config: Record<string, unknown>
}

export interface DashboardLayout {
  widgets: DashboardWidgetTemplate[]
  config: {
    theme?: 'light' | 'dark' | 'auto'
    refreshInterval?: number
    padding?: number
  }
}

export type DashboardTemplate = {
  id: string
  name: string
  description: string
  category: DashboardCategory
  thumbnail?: string
  layout: DashboardLayout
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Operations Command Centre – 6 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_001',
    name: 'Operations Command Centre',
    description: 'Centralised operations view with work order status, SLA compliance, open tickets, MTTR trend, daily incidents, and top sites by volume.',
    category: 'operations',
    layout: {
      config: { theme: 'auto', refreshInterval: 300, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'Work Orders by Status',
          type: 'report',
          reportId: 'sys_report_001',
          size: 'medium',
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w2',
          title: 'SLA Compliance Rate',
          type: 'report',
          reportId: 'sys_report_003',
          size: 'small',
          position: { x: 6, y: 0, w: 3, h: 4 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Open Tickets by Priority',
          type: 'report',
          reportId: 'sys_report_004',
          size: 'small',
          position: { x: 9, y: 0, w: 3, h: 4 },
          config: {},
        },
        {
          id: 'w4',
          title: 'Mean Time to Resolution',
          type: 'report',
          reportId: 'sys_report_005',
          size: 'medium',
          position: { x: 0, y: 4, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w5',
          title: 'Daily Incident Volume',
          type: 'report',
          reportId: 'sys_report_008',
          size: 'medium',
          position: { x: 6, y: 4, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w6',
          title: 'Top 10 Sites by Ticket Volume',
          type: 'report',
          reportId: 'sys_report_011',
          size: 'full',
          position: { x: 0, y: 8, w: 12, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Executive Summary – 6 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_002',
    name: 'Executive Summary',
    description: 'High-level executive view featuring four KPI metric widgets, a monthly activity trend line, and a technician performance table.',
    category: 'executive',
    layout: {
      config: { theme: 'auto', refreshInterval: 900, padding: 20 },
      widgets: [
        {
          id: 'w1',
          title: 'SLA Compliance Rate',
          type: 'metric',
          reportId: 'sys_report_003',
          size: 'small',
          position: { x: 0, y: 0, w: 3, h: 2 },
          config: { metricField: 'sla_met', format: '0.0%' },
        },
        {
          id: 'w2',
          title: 'Mean Time to Resolution',
          type: 'metric',
          reportId: 'sys_report_005',
          size: 'small',
          position: { x: 3, y: 0, w: 3, h: 2 },
          config: { metricField: 'resolution_time_hours', format: '0.1', suffix: ' hrs' },
        },
        {
          id: 'w3',
          title: 'Scheduled Delivery Success',
          type: 'metric',
          reportId: 'sys_report_019',
          size: 'small',
          position: { x: 6, y: 0, w: 3, h: 2 },
          config: { metricField: 'success_rate', format: '0.0%' },
        },
        {
          id: 'w4',
          title: 'Equipment Health Score',
          type: 'metric',
          reportId: 'sys_report_017',
          size: 'small',
          position: { x: 9, y: 0, w: 3, h: 2 },
          config: { metricField: 'health_score', format: '0.0' },
        },
        {
          id: 'w5',
          title: 'Monthly Report Activity',
          type: 'report',
          reportId: 'sys_report_009',
          size: 'large',
          position: { x: 0, y: 2, w: 8, h: 5 },
          config: {},
        },
        {
          id: 'w6',
          title: 'Technician Performance',
          type: 'report',
          reportId: 'sys_report_006',
          size: 'medium',
          position: { x: 8, y: 2, w: 4, h: 5 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 3. Security Overview – 4 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_003',
    name: 'Security Overview',
    description: 'Security-focused view covering the security events timeline, daily visitor counts, full audit log summary, and access patterns.',
    category: 'security',
    layout: {
      config: { theme: 'dark', refreshInterval: 60, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'Security Events Timeline',
          type: 'report',
          reportId: 'sys_report_015',
          size: 'large',
          position: { x: 0, y: 0, w: 8, h: 5 },
          config: {},
        },
        {
          id: 'w2',
          title: 'Visitor Count by Day',
          type: 'report',
          reportId: 'sys_report_016',
          size: 'medium',
          position: { x: 8, y: 0, w: 4, h: 5 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Audit Log Summary',
          type: 'report',
          reportId: 'sys_report_018',
          size: 'full',
          position: { x: 0, y: 5, w: 12, h: 5 },
          config: {},
        },
        {
          id: 'w4',
          title: 'User Logins by Day',
          type: 'report',
          reportId: 'sys_report_010',
          size: 'full',
          position: { x: 0, y: 10, w: 12, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 4. IT Infrastructure – 4 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_004',
    name: 'IT Infrastructure',
    description: 'IT operations dashboard covering data source refresh latency, user login trends, monthly report system activity, and delivery success rates.',
    category: 'it',
    layout: {
      config: { theme: 'auto', refreshInterval: 300, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'Data Source Refresh Latency',
          type: 'report',
          reportId: 'sys_report_020',
          size: 'large',
          position: { x: 0, y: 0, w: 8, h: 5 },
          config: {},
        },
        {
          id: 'w2',
          title: 'User Logins by Day',
          type: 'report',
          reportId: 'sys_report_010',
          size: 'medium',
          position: { x: 8, y: 0, w: 4, h: 5 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Monthly Report Activity',
          type: 'report',
          reportId: 'sys_report_009',
          size: 'medium',
          position: { x: 0, y: 5, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w4',
          title: 'Scheduled Delivery Success Rate',
          type: 'report',
          reportId: 'sys_report_019',
          size: 'medium',
          position: { x: 6, y: 5, w: 6, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Maintenance Dashboard – 4 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_005',
    name: 'Maintenance Dashboard',
    description: 'CMMS-oriented view showing asset downtime summary, work orders by site, technician performance table, and equipment health score gauge.',
    category: 'operations',
    layout: {
      config: { theme: 'auto', refreshInterval: 300, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'Asset Downtime Summary',
          type: 'report',
          reportId: 'sys_report_007',
          size: 'medium',
          position: { x: 0, y: 0, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w2',
          title: 'Work Orders by Site',
          type: 'report',
          reportId: 'sys_report_002',
          size: 'medium',
          position: { x: 6, y: 0, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Technician Performance',
          type: 'report',
          reportId: 'sys_report_006',
          size: 'large',
          position: { x: 0, y: 4, w: 8, h: 5 },
          config: {},
        },
        {
          id: 'w4',
          title: 'Equipment Health Score',
          type: 'report',
          reportId: 'sys_report_017',
          size: 'medium',
          position: { x: 8, y: 4, w: 4, h: 5 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Finance Overview – 3 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_006',
    name: 'Finance Overview',
    description: 'Financial performance view with budget vs actual spend, energy consumption by zone as a cost proxy, and monthly report activity trends.',
    category: 'executive',
    layout: {
      config: { theme: 'auto', refreshInterval: 3600, padding: 20 },
      widgets: [
        {
          id: 'w1',
          title: 'Budget vs Actual Spend',
          type: 'report',
          reportId: 'sys_report_013',
          size: 'full',
          position: { x: 0, y: 0, w: 12, h: 5 },
          config: {},
        },
        {
          id: 'w2',
          title: 'Energy Consumption by Zone',
          type: 'report',
          reportId: 'sys_report_014',
          size: 'medium',
          position: { x: 0, y: 5, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Monthly Activity Trends',
          type: 'report',
          reportId: 'sys_report_009',
          size: 'medium',
          position: { x: 6, y: 5, w: 6, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 7. HR Performance – 3 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_007',
    name: 'HR Performance',
    description: 'People analytics view showing user login activity patterns, monthly report usage by team, and technician performance data.',
    category: 'hr',
    layout: {
      config: { theme: 'auto', refreshInterval: 3600, padding: 20 },
      widgets: [
        {
          id: 'w1',
          title: 'User Logins by Day',
          type: 'report',
          reportId: 'sys_report_010',
          size: 'full',
          position: { x: 0, y: 0, w: 12, h: 4 },
          config: {},
        },
        {
          id: 'w2',
          title: 'Monthly Report Activity',
          type: 'report',
          reportId: 'sys_report_009',
          size: 'medium',
          position: { x: 0, y: 4, w: 6, h: 4 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Team Performance',
          type: 'report',
          reportId: 'sys_report_006',
          size: 'medium',
          position: { x: 6, y: 4, w: 6, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 8. SLA Compliance Centre – 4 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_008',
    name: 'SLA Compliance Centre',
    description: 'Dedicated SLA monitoring with compliance rate KPI gauge, breach heatmap by department, MTTR trend line, and priority breakdown pie chart.',
    category: 'operations',
    layout: {
      config: { theme: 'auto', refreshInterval: 600, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'SLA Compliance Rate',
          type: 'report',
          reportId: 'sys_report_003',
          size: 'medium',
          position: { x: 0, y: 0, w: 4, h: 4 },
          config: {},
        },
        {
          id: 'w2',
          title: 'SLA Breach Rate by Department',
          type: 'report',
          reportId: 'sys_report_012',
          size: 'large',
          position: { x: 4, y: 0, w: 8, h: 4 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Mean Time to Resolution',
          type: 'report',
          reportId: 'sys_report_005',
          size: 'large',
          position: { x: 0, y: 4, w: 8, h: 4 },
          config: {},
        },
        {
          id: 'w4',
          title: 'Open Tickets by Priority',
          type: 'report',
          reportId: 'sys_report_004',
          size: 'medium',
          position: { x: 8, y: 4, w: 4, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 9. Energy & Facilities – 3 widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_009',
    name: 'Energy & Facilities',
    description: 'Facilities management view with energy consumption by zone, equipment health gauge, and asset downtime KPIs.',
    category: 'operations',
    layout: {
      config: { theme: 'auto', refreshInterval: 600, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'Energy Consumption by Zone',
          type: 'report',
          reportId: 'sys_report_014',
          size: 'full',
          position: { x: 0, y: 0, w: 12, h: 5 },
          config: {},
        },
        {
          id: 'w2',
          title: 'Equipment Health Score',
          type: 'report',
          reportId: 'sys_report_017',
          size: 'medium',
          position: { x: 0, y: 5, w: 4, h: 4 },
          config: {},
        },
        {
          id: 'w3',
          title: 'Asset Downtime Summary',
          type: 'report',
          reportId: 'sys_report_007',
          size: 'large',
          position: { x: 4, y: 5, w: 8, h: 4 },
          config: {},
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 10. Blank Starter – placeholder widgets
  // ─────────────────────────────────────────────────────────────
  {
    id: 'tmpl_010',
    name: 'Blank Starter',
    description: 'An empty canvas pre-populated with a placeholder KPI metric, a text header widget, and a clock widget — ready for customisation.',
    category: 'operations',
    layout: {
      config: { theme: 'auto', refreshInterval: 0, padding: 16 },
      widgets: [
        {
          id: 'w1',
          title: 'Welcome',
          type: 'text',
          reportId: null,
          size: 'full',
          position: { x: 0, y: 0, w: 12, h: 2 },
          config: {
            content: '## Welcome to your new dashboard\nAdd widgets below to start visualising your data.',
            align: 'left',
          },
        },
        {
          id: 'w2',
          title: 'Key Metric',
          type: 'metric',
          reportId: null,
          size: 'small',
          position: { x: 0, y: 2, w: 3, h: 2 },
          config: { placeholder: true, label: 'Your KPI Here' },
        },
        {
          id: 'w3',
          title: 'Current Time',
          type: 'text',
          reportId: null,
          size: 'small',
          position: { x: 3, y: 2, w: 3, h: 2 },
          config: { widgetType: 'clock', format: 'HH:mm:ss', timezone: 'local' },
        },
      ],
    },
  },
]
