import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface WidgetConfig {
  id: string
  type:
    | 'report'
    | 'kpi'
    | 'text'
    | 'image'
    | 'clock'
    | 'refresh_timestamp'
    | 'metric_table'
    | 'alert_feed'
    | 'progress_group'
    | 'iframe'
    | 'geo_map'
    | 'custom_html'
  reportId?: string
  title?: string
  titleOverride?: string
  displayConfig: Record<string, unknown>
  gridPos: { x: number; y: number; w: number; h: number }
}

export interface ActiveFilter {
  sourceWidgetId: string
  field: string
  value: unknown
}

interface DashboardState {
  id: string | null
  name: string
  description: string
  widgets: WidgetConfig[]
  isEditMode: boolean
  autoRefreshSeconds: number | null
  dashboardFilters: Record<string, unknown>
  filterOverrides: Record<string, unknown>
  isFullscreen: boolean

  // Cross-widget filter state (for click-to-filter)
  activeFilters: Record<string, ActiveFilter>

  // Actions
  setId: (id: string | null) => void
  setName: (name: string) => void
  setDescription: (description: string) => void
  setEditMode: (isEdit: boolean) => void
  addWidget: (widget: WidgetConfig) => void
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void
  removeWidget: (id: string) => void
  updateLayout: (layouts: { id: string; x: number; y: number; w: number; h: number }[]) => void
  setFilterOverride: (field: string, value: unknown) => void
  resetFilterOverrides: () => void
  setActiveFilter: (widgetId: string, field: string, value: unknown) => void
  clearActiveFilter: (widgetId: string) => void
  clearAllActiveFilters: () => void
  setFullscreen: (isFullscreen: boolean) => void
  setAutoRefresh: (seconds: number | null) => void
  setDashboardFilters: (filters: Record<string, unknown>) => void
  loadDashboard: (data: {
    id: string
    name: string
    description: string
    widgets: WidgetConfig[]
    autoRefreshSeconds?: number | null
    dashboardFilters?: Record<string, unknown>
  }) => void
  resetDashboard: () => void
}

const initialState = {
  id: null,
  name: 'Untitled Dashboard',
  description: '',
  widgets: [],
  isEditMode: false,
  autoRefreshSeconds: null,
  dashboardFilters: {},
  filterOverrides: {},
  isFullscreen: false,
  activeFilters: {},
}

export const useDashboardStore = create<DashboardState>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setId: (id) => set({ id }),

    setName: (name) => set({ name }),

    setDescription: (description) => set({ description }),

    setEditMode: (isEdit) => set({ isEditMode: isEdit }),

    addWidget: (widget) =>
      set((state) => ({
        widgets: [...state.widgets, widget],
      })),

    updateWidget: (id, updates) =>
      set((state) => ({
        widgets: state.widgets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
      })),

    removeWidget: (id) =>
      set((state) => ({
        widgets: state.widgets.filter((w) => w.id !== id),
      })),

    updateLayout: (layouts) =>
      set((state) => ({
        widgets: state.widgets.map((widget) => {
          const layout = layouts.find((l) => l.id === widget.id)
          if (!layout) return widget
          return {
            ...widget,
            gridPos: { x: layout.x, y: layout.y, w: layout.w, h: layout.h },
          }
        }),
      })),

    setFilterOverride: (field, value) =>
      set((state) => ({
        filterOverrides: { ...state.filterOverrides, [field]: value },
      })),

    resetFilterOverrides: () => set({ filterOverrides: {} }),

    setActiveFilter: (widgetId, field, value) =>
      set((state) => ({
        activeFilters: {
          ...state.activeFilters,
          [widgetId]: { sourceWidgetId: widgetId, field, value },
        },
      })),

    clearActiveFilter: (widgetId) =>
      set((state) => {
        const next = { ...state.activeFilters }
        delete next[widgetId]
        return { activeFilters: next }
      }),

    clearAllActiveFilters: () => set({ activeFilters: {} }),

    setFullscreen: (isFullscreen) => set({ isFullscreen }),

    setAutoRefresh: (seconds) => set({ autoRefreshSeconds: seconds }),

    setDashboardFilters: (filters) => set({ dashboardFilters: filters }),

    loadDashboard: (data) =>
      set({
        id: data.id,
        name: data.name,
        description: data.description,
        widgets: data.widgets,
        autoRefreshSeconds: data.autoRefreshSeconds ?? null,
        dashboardFilters: data.dashboardFilters ?? {},
        filterOverrides: {},
        activeFilters: {},
        isEditMode: false,
      }),

    resetDashboard: () => set(initialState),
  })),
)
