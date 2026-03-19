// InsightForge – 20 System Report Definitions
// Pre-built reports for common analytics use cases

import type { ReportDefinition } from '@/lib/query-engine/types'

export type SystemReportCategory =
  | 'operations'
  | 'performance'
  | 'security'
  | 'finance'
  | 'hr'
  | 'it'

export type SystemReport = {
  id: string
  name: string
  description: string
  category: SystemReportCategory
  // name and id are stored at the top level; definition omits them to avoid duplication
  definition: Omit<ReportDefinition, 'id' | 'name'>
  previewImageUrl?: string
}

// Placeholder data source IDs – replaced at seed time with real UUIDs
export const DEMO_SOURCE_ID = 'demo-webhook-source'

export const SYSTEM_REPORTS: SystemReport[] = [
  // ─────────────────────────────────────────────────────────────
  // 1. Work Orders by Status
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_001',
    name: 'Work Orders by Status',
    description: 'Grouped bar chart showing work order counts broken down by current status.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'status',
          label: 'Status',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'id',
          label: 'Count',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [],
      sorts: [{ fieldId: 'f2', field: 'id', direction: 'desc', priority: 1 }],
      chartConfig: {
        type: 'bar',
        xAxisField: 'status',
        yAxisFields: ['id'],
        orientation: 'vertical',
        showLegend: true,
        showDataLabels: true,
        colors: ['#7c3aed', '#a78bfa', '#ddd6fe'],
      },
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 2. Work Orders by Site
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_002',
    name: 'Work Orders by Site',
    description: 'Horizontal bar chart comparing work order volume across different sites.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'sites',
          columnName: 'name',
          label: 'Site',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'id',
          label: 'Work Orders',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [],
      sorts: [{ fieldId: 'f2', field: 'id', direction: 'desc', priority: 1 }],
      limit: 20,
      chartConfig: {
        type: 'bar',
        xAxisField: 'id',
        yAxisFields: ['name'],
        orientation: 'horizontal',
        showDataLabels: true,
        showLegend: false,
        colors: ['#7c3aed'],
      },
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 3. SLA Compliance Rate
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_003',
    name: 'SLA Compliance Rate',
    description: 'KPI scorecard showing overall SLA compliance percentage with 30-day trend sparkline.',
    category: 'performance',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'resolved_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'sla_met',
          label: 'SLA Compliance %',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.0%',
          isCalculated: true,
          formula: 'AVG(CASE WHEN sla_met = true THEN 1.0 ELSE 0.0 END) * 100',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'resolved_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'resolved_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'gauge',
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeBands: [
          { min: 0, max: 70, color: '#ef4444', label: 'Poor' },
          { min: 70, max: 90, color: '#f59e0b', label: 'Acceptable' },
          { min: 90, max: 100, color: '#22c55e', label: 'Excellent' },
        ],
        sparklineField: 'sla_met',
        trendField: 'resolved_at',
        kpiSize: 'large',
        colorThresholds: [
          { value: 90, color: 'green', operator: '>=' },
          { value: 70, color: 'amber', operator: '>=' },
          { value: 0, color: 'red', operator: '>=' },
        ],
      },
      cacheSeconds: 600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 4. Open Tickets by Priority
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_004',
    name: 'Open Tickets by Priority',
    description: 'Pie chart breaking down currently open tickets by priority level.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'priority',
          label: 'Priority',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'id',
          label: 'Count',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f_state',
          field: 'state',
          operator: 'eq',
          value: 'open',
          type: 'string',
        },
      ],
      sorts: [{ fieldId: 'f2', field: 'id', direction: 'desc', priority: 1 }],
      chartConfig: {
        type: 'pie',
        labelFormat: 'both',
        showLegend: true,
        legendPosition: 'right',
        minSlicePercent: 2,
        colors: ['#ef4444', '#f97316', '#f59e0b', '#22c55e'],
      },
      cacheSeconds: 120,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 5. Mean Time to Resolution
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_005',
    name: 'Mean Time to Resolution',
    description: 'KPI scorecard with line trend showing average resolution time in hours over the last 30 days.',
    category: 'performance',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'closed_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'resolution_time_hours',
          label: 'MTTR (hrs)',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.1',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'closed_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'closed_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'line',
        xAxisField: 'closed_at',
        yAxisFields: ['resolution_time_hours'],
        smooth: true,
        fillArea: false,
        showLegend: false,
        trendField: 'closed_at',
        kpiSize: 'large',
        colorThresholds: [
          { value: 24, color: 'green', operator: '<=' },
          { value: 48, color: 'amber', operator: '<=' },
          { value: 48, color: 'red', operator: '>' },
        ],
        colors: ['#7c3aed'],
      },
      cacheSeconds: 600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 6. Technician Performance
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_006',
    name: 'Technician Performance',
    description: 'Data table showing each technician\'s completed work orders, average resolution time, and SLA compliance rate, sorted by resolution time.',
    category: 'performance',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'technicians',
          columnName: 'name',
          label: 'Technician',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'id',
          label: 'Completed WOs',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'resolution_time_hours',
          label: 'Avg Resolution (hrs)',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.1',
        },
        {
          id: 'f4',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'work_orders',
          columnName: 'sla_met',
          label: 'SLA Compliance %',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.0%',
          isCalculated: true,
          formula: 'AVG(CASE WHEN sla_met = true THEN 100.0 ELSE 0.0 END)',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f_status',
          field: 'status',
          operator: 'eq',
          value: 'completed',
          type: 'string',
        },
      ],
      sorts: [{ fieldId: 'f3', field: 'resolution_time_hours', direction: 'asc', priority: 1 }],
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 7. Asset Downtime Summary
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_007',
    name: 'Asset Downtime Summary',
    description: 'Bar chart showing total downtime hours per asset, highlighting the worst performers.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'assets',
          columnName: 'name',
          label: 'Asset',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'asset_downtime',
          columnName: 'duration_hours',
          label: 'Downtime (hrs)',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'sum',
          format: '0.1',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f_date',
          field: 'started_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f2', field: 'duration_hours', direction: 'desc', priority: 1 }],
      limit: 15,
      chartConfig: {
        type: 'bar',
        xAxisField: 'name',
        yAxisFields: ['duration_hours'],
        orientation: 'vertical',
        showDataLabels: true,
        showLegend: false,
        colors: ['#ef4444'],
      },
      cacheSeconds: 600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 8. Daily Incident Volume
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_008',
    name: 'Daily Incident Volume',
    description: 'Line chart tracking total incident count per day over the last 30 days.',
    category: 'security',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'incidents',
          columnName: 'occurred_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'incidents',
          columnName: 'id',
          label: 'Incidents',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'occurred_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'occurred_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'line',
        xAxisField: 'occurred_at',
        yAxisFields: ['id'],
        smooth: true,
        fillArea: true,
        showLegend: false,
        showDataLabels: false,
        colors: ['#ef4444'],
      },
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 9. Monthly Report Activity
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_009',
    name: 'Monthly Report Activity',
    description: 'Stacked area chart showing report views and executions by month over the last 12 months.',
    category: 'it',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'report_activity',
          columnName: 'occurred_at',
          label: 'Month',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'month',
          format: 'MMM yyyy',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'report_activity',
          columnName: 'views',
          label: 'Views',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'sum',
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'report_activity',
          columnName: 'executions',
          label: 'Executions',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'sum',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'occurred_at',
          operator: 'gte',
          value: '{{__12m_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'occurred_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'area',
        xAxisField: 'occurred_at',
        yAxisFields: ['views', 'executions'],
        stack: true,
        stackMode: 'normal',
        smooth: true,
        fillArea: true,
        showLegend: true,
        legendPosition: 'bottom',
        colors: ['#7c3aed', '#a78bfa'],
      },
      cacheSeconds: 3600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 10. User Logins by Day
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_010',
    name: 'User Logins by Day',
    description: 'Line chart tracking unique user login events per day over the last 30 days.',
    category: 'security',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'audit_log',
          columnName: 'created_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'audit_log',
          columnName: 'user_id',
          label: 'Unique Logins',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'distinct_count',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f_action',
          field: 'action',
          operator: 'eq',
          value: 'login',
          type: 'string',
        },
        {
          id: 'flt2',
          fieldId: 'f1',
          field: 'created_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'created_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'line',
        xAxisField: 'created_at',
        yAxisFields: ['user_id'],
        smooth: true,
        fillArea: true,
        showLegend: false,
        colors: ['#3b82f6'],
      },
      cacheSeconds: 900,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 11. Top 10 Sites by Ticket Volume
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_011',
    name: 'Top 10 Sites by Ticket Volume',
    description: 'Horizontal bar chart showing the 10 sites with the highest ticket volume.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'sites',
          columnName: 'name',
          label: 'Site',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'id',
          label: 'Ticket Count',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [],
      sorts: [{ fieldId: 'f2', field: 'id', direction: 'desc', priority: 1 }],
      limit: 10,
      chartConfig: {
        type: 'bar',
        xAxisField: 'id',
        yAxisFields: ['name'],
        orientation: 'horizontal',
        showDataLabels: true,
        showLegend: false,
        colors: ['#7c3aed'],
      },
      cacheSeconds: 600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 12. SLA Breach Rate by Department
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_012',
    name: 'SLA Breach Rate by Department',
    description: 'Heatmap showing SLA breach rates segmented by department and priority level.',
    category: 'performance',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'departments',
          columnName: 'name',
          label: 'Department',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'priority',
          label: 'Priority',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'tickets',
          columnName: 'sla_breached',
          label: 'Breach Rate %',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.0%',
          isCalculated: true,
          formula: 'AVG(CASE WHEN sla_breached = true THEN 100.0 ELSE 0.0 END)',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f_date',
          field: 'created_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [],
      chartConfig: {
        type: 'heatmap',
        heatmapXField: 'priority',
        heatmapYField: 'name',
        heatmapValueField: 'sla_breached',
        showLegend: true,
        colors: ['#ddd6fe', '#ef4444'],
      },
      cacheSeconds: 900,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 13. Budget vs Actual Spend
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_013',
    name: 'Budget vs Actual Spend',
    description: 'Bullet chart comparing actual spend against budget targets per cost category.',
    category: 'finance',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'budgets',
          columnName: 'category',
          label: 'Category',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'budgets',
          columnName: 'budget_amount',
          label: 'Budget',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'sum',
          format: '$0,0',
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'budgets',
          columnName: 'actual_amount',
          label: 'Actual Spend',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'sum',
          format: '$0,0',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f_period',
          field: 'period',
          operator: 'eq',
          value: '{{__current_period}}',
          type: 'string',
          allowDashboardOverride: true,
          parameterName: 'fiscal_period',
        },
      ],
      sorts: [{ fieldId: 'f3', field: 'actual_amount', direction: 'desc', priority: 1 }],
      chartConfig: {
        type: 'bar',
        xAxisField: 'category',
        yAxisFields: ['actual_amount'],
        targetField: 'budget_amount',
        showDataLabels: true,
        showLegend: true,
        referenceLines: [{ value: 0, label: 'Budget', color: '#22c55e', style: 'dashed' }],
        colors: ['#7c3aed', '#e5e7eb'],
      },
      cacheSeconds: 3600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 14. Energy Consumption by Zone
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_014',
    name: 'Energy Consumption by Zone',
    description: 'Line chart showing kWh energy consumption broken down by facility zone over time.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'energy_readings',
          columnName: 'recorded_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'energy_readings',
          columnName: 'zone',
          label: 'Zone',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'energy_readings',
          columnName: 'kwh',
          label: 'kWh Consumed',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'sum',
          format: '0,0.0',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'recorded_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'recorded_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'line',
        xAxisField: 'recorded_at',
        yAxisFields: ['kwh'],
        groupByField: 'zone',
        smooth: true,
        fillArea: false,
        showLegend: true,
        legendPosition: 'bottom',
        colors: ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
      },
      cacheSeconds: 600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 15. Security Events Timeline
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_015',
    name: 'Security Events Timeline',
    description: 'Line chart showing security event counts by severity over the last 30 days.',
    category: 'security',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'security_events',
          columnName: 'occurred_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'security_events',
          columnName: 'severity',
          label: 'Severity',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'security_events',
          columnName: 'id',
          label: 'Event Count',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'occurred_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'occurred_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'line',
        xAxisField: 'occurred_at',
        yAxisFields: ['id'],
        groupByField: 'severity',
        smooth: false,
        showLegend: true,
        legendPosition: 'top',
        colors: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'],
      },
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 16. Visitor Count by Day
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_016',
    name: 'Visitor Count by Day',
    description: 'Bar chart showing the total number of visitors recorded per day over the last 14 days.',
    category: 'security',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'visitor_logs',
          columnName: 'entry_time',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'visitor_logs',
          columnName: 'id',
          label: 'Visitor Count',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'count',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'entry_time',
          operator: 'gte',
          value: '{{__14d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'entry_time', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'bar',
        xAxisField: 'entry_time',
        yAxisFields: ['id'],
        orientation: 'vertical',
        showDataLabels: false,
        showLegend: false,
        colors: ['#0891b2'],
      },
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 17. Equipment Health Score
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_017',
    name: 'Equipment Health Score',
    description: 'Gauge chart displaying the average health score across all monitored equipment.',
    category: 'operations',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'equipment',
          columnName: 'name',
          label: 'Equipment',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'equipment',
          columnName: 'health_score',
          label: 'Health Score',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.0',
        },
      ],
      filters: [],
      sorts: [{ fieldId: 'f2', field: 'health_score', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'gauge',
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeBands: [
          { min: 0, max: 60, color: '#ef4444', label: 'Critical' },
          { min: 60, max: 80, color: '#f59e0b', label: 'Warning' },
          { min: 80, max: 100, color: '#22c55e', label: 'Healthy' },
        ],
        kpiSize: 'large',
        colorThresholds: [
          { value: 80, color: 'green', operator: '>=' },
          { value: 60, color: 'amber', operator: '>=' },
          { value: 0, color: 'red', operator: '>=' },
        ],
      },
      cacheSeconds: 300,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 18. Audit Log Summary
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_018',
    name: 'Audit Log Summary',
    description: 'Data table showing recent audit events with user, action, entity type, and timestamp.',
    category: 'security',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'audit_log',
          columnName: 'created_at',
          label: 'Timestamp',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          format: 'MMM d, HH:mm:ss',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'users',
          columnName: 'email',
          label: 'User',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'audit_log',
          columnName: 'action',
          label: 'Action',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f4',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'audit_log',
          columnName: 'entity_type',
          label: 'Entity Type',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f5',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'audit_log',
          columnName: 'ip_address',
          label: 'IP Address',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'created_at',
          operator: 'gte',
          value: '{{__7d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'created_at', direction: 'desc', priority: 1 }],
      limit: 100,
      cacheSeconds: 60,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 19. Scheduled Delivery Success Rate
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_019',
    name: 'Scheduled Delivery Success Rate',
    description: 'KPI scorecard showing the percentage of scheduled report deliveries that succeeded.',
    category: 'it',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'delivery_log',
          columnName: 'started_at',
          label: 'Date',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          dateGranularity: 'day',
          format: 'MMM d',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'delivery_log',
          columnName: 'success_rate',
          label: 'Success Rate %',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0.0%',
          isCalculated: true,
          formula: "AVG(CASE WHEN status = 'success' THEN 100.0 ELSE 0.0 END)",
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'started_at',
          operator: 'gte',
          value: '{{__30d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'started_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'gauge',
        gaugeMin: 0,
        gaugeMax: 100,
        gaugeBands: [
          { min: 0, max: 80, color: '#ef4444', label: 'Poor' },
          { min: 80, max: 95, color: '#f59e0b', label: 'Acceptable' },
          { min: 95, max: 100, color: '#22c55e', label: 'Excellent' },
        ],
        kpiSize: 'large',
        sparklineField: 'success_rate',
        trendField: 'started_at',
        colorThresholds: [
          { value: 95, color: 'green', operator: '>=' },
          { value: 80, color: 'amber', operator: '>=' },
          { value: 0, color: 'red', operator: '>=' },
        ],
      },
      cacheSeconds: 600,
    },
  },

  // ─────────────────────────────────────────────────────────────
  // 20. Data Source Refresh Latency
  // ─────────────────────────────────────────────────────────────
  {
    id: 'sys_report_020',
    name: 'Data Source Refresh Latency',
    description: 'Scatter plot showing data source sync duration (ms) over time to identify latency spikes.',
    category: 'it',
    definition: {
      dataSourceId: DEMO_SOURCE_ID,
      fields: [
        {
          id: 'f1',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'data_source_syncs',
          columnName: 'synced_at',
          label: 'Sync Time',
          type: 'date',
          isDimension: true,
          isMeasure: false,
          format: 'MMM d HH:mm',
        },
        {
          id: 'f2',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'data_source_syncs',
          columnName: 'source_name',
          label: 'Data Source',
          type: 'string',
          isDimension: true,
          isMeasure: false,
        },
        {
          id: 'f3',
          sourceId: DEMO_SOURCE_ID,
          tableName: 'data_source_syncs',
          columnName: 'duration_ms',
          label: 'Duration (ms)',
          type: 'number',
          isDimension: false,
          isMeasure: true,
          aggregation: 'avg',
          format: '0,0',
        },
      ],
      filters: [
        {
          id: 'flt1',
          fieldId: 'f1',
          field: 'synced_at',
          operator: 'gte',
          value: '{{__7d_ago}}',
          type: 'date',
          allowDashboardOverride: true,
          parameterName: 'date_from',
        },
      ],
      sorts: [{ fieldId: 'f1', field: 'synced_at', direction: 'asc', priority: 1 }],
      chartConfig: {
        type: 'scatter',
        xAxisField: 'synced_at',
        yAxisFields: ['duration_ms'],
        colorField: 'source_name',
        showLegend: true,
        legendPosition: 'bottom',
        referenceLines: [
          { value: 5000, label: 'Warning threshold', color: '#f59e0b', style: 'dashed' },
          { value: 15000, label: 'Critical threshold', color: '#ef4444', style: 'dashed' },
        ],
        colors: ['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444'],
      },
      cacheSeconds: 900,
    },
  },
]
