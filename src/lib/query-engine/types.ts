// InsightForge – Query Engine Types

import { ChartType, FilterOperator } from '@/types/insightsforge'

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'json'
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct_count' | 'median' | 'stddev' | 'variance' | 'first' | 'last'
export type DateGranularity = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'hour' | 'minute'
export type JoinType = 'inner' | 'left' | 'right' | 'full'
export type LogicOperator = 'AND' | 'OR'

export interface FieldConfig {
  id: string
  sourceId: string
  tableName: string
  columnName: string
  label: string
  type: FieldType
  isDimension: boolean
  isMeasure: boolean
  aggregation?: AggregationType
  dateGranularity?: DateGranularity
  bucketSize?: number
  bucketUnit?: string
  format?: string
  formula?: string
  isCalculated?: boolean
  sortDirection?: 'asc' | 'desc'
  visible?: boolean
  width?: number
  align?: 'left' | 'center' | 'right'
}

export interface FilterConfig {
  id: string
  fieldId: string
  field: string
  tableName?: string
  sourceId?: string
  operator: FilterOperator
  value: unknown
  value2?: unknown // for BETWEEN
  type: FieldType
  logicOperator?: LogicOperator
  isGroup?: boolean
  children?: FilterConfig[]
  allowDashboardOverride?: boolean
  parameterName?: string
}

export interface SortConfig {
  fieldId: string
  field: string
  direction: 'asc' | 'desc'
  priority: number
}

export interface JoinCondition {
  leftField: string
  rightField: string
  operator: '=' | '!=' | '<' | '>' | '<=' | '>='
}

export interface JoinConfig {
  id: string
  leftSourceId: string
  rightSourceId: string
  joinType: JoinType
  conditions: JoinCondition[]
  alias?: string
}

export interface ChartConfig {
  type: ChartType
  xAxisField?: string
  yAxisFields?: string[]
  groupByField?: string
  colorField?: string
  sizeField?: string
  labelField?: string
  smooth?: boolean
  stack?: boolean
  fillArea?: boolean
  showDataLabels?: boolean
  showLegend?: boolean
  legendPosition?: 'top' | 'bottom' | 'left' | 'right'
  colors?: string[]
  orientation?: 'vertical' | 'horizontal'
  stackMode?: 'normal' | 'percent'
  donutInnerRadius?: number
  minSlicePercent?: number
  labelFormat?: 'value' | 'percent' | 'both'
  gaugeMin?: number
  gaugeMax?: number
  gaugeBands?: GaugeBand[]
  referenceLines?: ReferenceLine[]
  secondaryYAxis?: boolean
  secondaryYAxisFields?: string[]
  dataZoom?: boolean
  tooltip?: boolean
  padding?: [number, number, number, number]
  theme?: 'default' | 'dark' | 'custom'
  customColors?: string[]
  // KPI specific
  trendField?: string
  targetValue?: number
  targetField?: string
  colorThresholds?: ColorThreshold[]
  sparklineField?: string
  kpiSize?: 'small' | 'medium' | 'large'
  // Comparison
  comparisonEnabled?: boolean
  comparisonPeriod?: 'prior_period' | 'prior_year' | 'custom'
  // Heatmap
  heatmapXField?: string
  heatmapYField?: string
  heatmapValueField?: string
  // Sankey
  sourceNodeField?: string
  targetNodeField?: string
  valueNodeField?: string
  // Geo
  geoField?: string
  geoValueField?: string
  geoType?: 'choropleth' | 'bubble'
  // Calendar
  calendarDateField?: string
  calendarValueField?: string
  // Radar
  radarIndicators?: string[]
  // Waterfall
  waterfallStartField?: string
  waterfallEndField?: string
}

export interface GaugeBand {
  min: number
  max: number
  color: string
  label?: string
}

export interface ReferenceLine {
  value: number
  label?: string
  color?: string
  style?: 'solid' | 'dashed' | 'dotted'
}

export interface ColorThreshold {
  value: number
  color: 'red' | 'amber' | 'green'
  operator: '<' | '<=' | '>' | '>=' | '='
}

export interface ReportDefinition {
  id?: string
  name: string
  description?: string
  dataSourceId: string
  joins?: JoinConfig[]
  fields: FieldConfig[]
  filters: FilterConfig[]
  sorts: SortConfig[]
  limit?: number
  offset?: number
  chartConfig?: ChartConfig
  customSql?: string
  cacheSeconds?: number
  parameters?: ReportParameter[]
}

export interface ReportParameter {
  name: string
  label: string
  type: FieldType
  defaultValue?: unknown
  required?: boolean
  options?: { label: string; value: unknown }[]
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  columns: QueryResultColumn[]
  totalRows: number
  queryTimeMs: number
  cached?: boolean
  truncated?: boolean
}

export interface QueryResultColumn {
  id: string
  label: string
  type: FieldType
  field: string
  aggregation?: AggregationType
}

export interface AvailableField {
  id: string
  sourceId: string
  sourceName: string
  tableName: string
  columnName: string
  label: string
  type: FieldType
  isDimension: boolean
  isMeasure: boolean
  description?: string
  sampleValues?: unknown[]
  cardinality?: number
}
