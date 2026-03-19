import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import {
  ReportDefinition,
  FieldConfig,
  FilterConfig,
  SortConfig,
  ChartConfig,
} from '@/lib/query-engine/types'

interface PreviewData {
  rows: Record<string, unknown>[]
  columns: { id: string; label: string; type: string; field: string }[]
  totalRows: number
  queryTimeMs: number
}

export type ActiveTab = 'fields' | 'filters' | 'sort' | 'chart' | 'advanced'
export type ViewMode = 'table' | 'chart' | 'summary'

interface ReportBuilderState {
  definition: ReportDefinition
  isDirty: boolean
  isSaving: boolean
  isRunning: boolean
  previewData: PreviewData | null
  previewError: string | null
  activeTab: ActiveTab
  viewMode: ViewMode
  drillPath: { dimension: string; value: unknown }[]

  // Actions
  setDefinitionName: (name: string) => void
  setDescription: (description: string) => void
  setDataSource: (sourceId: string) => void
  addField: (field: FieldConfig) => void
  removeField: (fieldId: string) => void
  updateField: (fieldId: string, updates: Partial<FieldConfig>) => void
  reorderFields: (fromIndex: number, toIndex: number) => void
  addFilter: (filter: Omit<FilterConfig, 'id'>) => void
  removeFilter: (filterId: string) => void
  updateFilter: (filterId: string, updates: Partial<FilterConfig>) => void
  addSort: (sort: Omit<SortConfig, 'priority'>) => void
  removeSort: (fieldId: string) => void
  updateSort: (fieldId: string, updates: Partial<SortConfig>) => void
  reorderSorts: (fromIndex: number, toIndex: number) => void
  updateChartConfig: (config: Partial<ChartConfig>) => void
  setLimit: (limit: number | undefined) => void
  setOffset: (offset: number | undefined) => void
  setCustomSql: (sql: string | undefined) => void
  setCacheSeconds: (seconds: number) => void
  setActiveTab: (tab: ActiveTab) => void
  setViewMode: (mode: ViewMode) => void
  setPreviewData: (data: PreviewData | null) => void
  setPreviewError: (error: string | null) => void
  setIsSaving: (saving: boolean) => void
  setIsRunning: (running: boolean) => void
  drill: (dimension: string, value: unknown) => void
  drillUp: (index?: number) => void
  loadDefinition: (definition: ReportDefinition) => void
  reset: () => void
}

const initialDefinition: ReportDefinition = {
  name: 'Untitled Report',
  dataSourceId: '',
  fields: [],
  filters: [],
  sorts: [],
  limit: 1000,
  offset: 0,
}

export const useReportBuilderStore = create<ReportBuilderState>()((set, get) => ({
  definition: { ...initialDefinition },
  isDirty: false,
  isSaving: false,
  isRunning: false,
  previewData: null,
  previewError: null,
  activeTab: 'fields',
  viewMode: 'table',
  drillPath: [],

  setDefinitionName: (name) =>
    set((s) => ({ definition: { ...s.definition, name }, isDirty: true })),

  setDescription: (description) =>
    set((s) => ({ definition: { ...s.definition, description }, isDirty: true })),

  setDataSource: (sourceId) =>
    set((s) => ({
      definition: { ...s.definition, dataSourceId: sourceId, fields: [], filters: [], sorts: [] },
      isDirty: true,
    })),

  addField: (field) =>
    set((s) => {
      if (s.definition.fields.find((f) => f.id === field.id)) return {}
      return { definition: { ...s.definition, fields: [...s.definition.fields, field] }, isDirty: true }
    }),

  removeField: (fieldId) =>
    set((s) => ({
      definition: {
        ...s.definition,
        fields: s.definition.fields.filter((f) => f.id !== fieldId),
        sorts: s.definition.sorts.filter((so) => so.fieldId !== fieldId),
      },
      isDirty: true,
    })),

  updateField: (fieldId, updates) =>
    set((s) => ({
      definition: {
        ...s.definition,
        fields: s.definition.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      },
      isDirty: true,
    })),

  reorderFields: (fromIndex, toIndex) =>
    set((s) => {
      const fields = [...s.definition.fields]
      const [moved] = fields.splice(fromIndex, 1)
      if (moved) fields.splice(toIndex, 0, moved)
      return { definition: { ...s.definition, fields }, isDirty: true }
    }),

  addFilter: (filter) =>
    set((s) => ({
      definition: {
        ...s.definition,
        filters: [...s.definition.filters, { ...filter, id: uuidv4() }],
      },
      isDirty: true,
    })),

  removeFilter: (filterId) =>
    set((s) => ({
      definition: {
        ...s.definition,
        filters: s.definition.filters.filter((f) => f.id !== filterId),
      },
      isDirty: true,
    })),

  updateFilter: (filterId, updates) =>
    set((s) => ({
      definition: {
        ...s.definition,
        filters: s.definition.filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
      },
      isDirty: true,
    })),

  addSort: (sort) =>
    set((s) => {
      if (s.definition.sorts.find((so) => so.fieldId === sort.fieldId)) return {}
      return {
        definition: {
          ...s.definition,
          sorts: [...s.definition.sorts, { ...sort, priority: s.definition.sorts.length }],
        },
        isDirty: true,
      }
    }),

  removeSort: (fieldId) =>
    set((s) => ({
      definition: {
        ...s.definition,
        sorts: s.definition.sorts
          .filter((so) => so.fieldId !== fieldId)
          .map((so, i) => ({ ...so, priority: i })),
      },
      isDirty: true,
    })),

  updateSort: (fieldId, updates) =>
    set((s) => ({
      definition: {
        ...s.definition,
        sorts: s.definition.sorts.map((so) =>
          so.fieldId === fieldId ? { ...so, ...updates } : so
        ),
      },
      isDirty: true,
    })),

  reorderSorts: (fromIndex, toIndex) =>
    set((s) => {
      const sorts = [...s.definition.sorts]
      const [moved] = sorts.splice(fromIndex, 1)
      if (moved) sorts.splice(toIndex, 0, moved)
      return {
        definition: { ...s.definition, sorts: sorts.map((so, i) => ({ ...so, priority: i })) },
        isDirty: true,
      }
    }),

  updateChartConfig: (config) =>
    set((s) => ({
      definition: {
        ...s.definition,
        chartConfig: { ...(s.definition.chartConfig ?? { type: 'bar' as const }), ...config },
      },
      isDirty: true,
    })),

  setLimit: (limit) =>
    set((s) => ({ definition: { ...s.definition, limit }, isDirty: true })),

  setOffset: (offset) =>
    set((s) => ({ definition: { ...s.definition, offset }, isDirty: true })),

  setCustomSql: (sql) =>
    set((s) => ({ definition: { ...s.definition, customSql: sql }, isDirty: true })),

  setCacheSeconds: (seconds) =>
    set((s) => ({ definition: { ...s.definition, cacheSeconds: seconds }, isDirty: true })),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setPreviewData: (data) => set({ previewData: data, previewError: null }),

  setPreviewError: (error) => set({ previewError: error, previewData: null }),

  setIsSaving: (saving) => set({ isSaving: saving }),

  setIsRunning: (running) => set({ isRunning: running }),

  drill: (dimension, value) =>
    set((s) => ({
      drillPath: [...s.drillPath, { dimension, value }],
      definition: {
        ...s.definition,
        filters: [
          ...s.definition.filters,
          {
            id: uuidv4(),
            fieldId: dimension,
            field: dimension,
            operator: 'eq' as const,
            value,
            type: 'string' as const,
            logicOperator: 'AND' as const,
          },
        ],
      },
      isDirty: true,
    })),

  drillUp: (index) =>
    set((s) => {
      const targetIndex = index ?? s.drillPath.length - 1
      const newPath = s.drillPath.slice(0, targetIndex)
      const removed = s.drillPath.slice(targetIndex)
      const drillFields = removed.map((d) => d.dimension)
      return {
        drillPath: newPath,
        definition: {
          ...s.definition,
          filters: s.definition.filters.filter((f) => !drillFields.includes(f.fieldId)),
        },
        isDirty: true,
      }
    }),

  loadDefinition: (definition) =>
    set({
      definition,
      isDirty: false,
      previewData: null,
      previewError: null,
      drillPath: [],
    }),

  reset: () =>
    set({
      definition: { ...initialDefinition },
      isDirty: false,
      isSaving: false,
      isRunning: false,
      previewData: null,
      previewError: null,
      activeTab: 'fields',
      viewMode: 'table',
      drillPath: [],
    }),
}))
