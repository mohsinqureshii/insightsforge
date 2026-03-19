'use client'

import React, { useMemo, useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Plus,
  Hash,
  Calendar,
  Type,
  ToggleLeft,
  Braces,
  List,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AvailableField, FieldConfig, FieldType } from '@/lib/query-engine/types'
import { v4 as uuidv4 } from 'uuid'

const TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  string: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  boolean: <ToggleLeft className="h-3.5 w-3.5" />,
  array: <List className="h-3.5 w-3.5" />,
  json: <Braces className="h-3.5 w-3.5" />,
}

const TYPE_COLORS: Record<FieldType, string> = {
  string: 'text-blue-500',
  number: 'text-green-500',
  date: 'text-orange-500',
  boolean: 'text-purple-500',
  array: 'text-pink-500',
  json: 'text-gray-500',
}

async function fetchAvailableFields(sourceId: string): Promise<AvailableField[]> {
  const res = await fetch(`/api/v1/data-sources/${sourceId}/fields`)
  if (!res.ok) throw new Error('Failed to fetch fields')
  const data = await res.json()
  return data.data ?? []
}

interface FieldPickerProps {
  sourceId: string
  activeFieldIds: Set<string>
  onAddField: (field: FieldConfig) => void
}

export function FieldPicker({ sourceId, activeFieldIds, onAddField }: FieldPickerProps) {
  const [search, setSearch] = useState('')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const { data: fields = [], isLoading, error } = useQuery({
    queryKey: ['available-fields', sourceId],
    queryFn: () => fetchAvailableFields(sourceId),
    enabled: !!sourceId,
  })

  const { dimensions, measures } = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.columnName.toLowerCase().includes(q) ||
        f.tableName.toLowerCase().includes(q)
    )
    return {
      dimensions: filtered.filter((f) => f.isDimension),
      measures: filtered.filter((f) => f.isMeasure),
    }
  }, [fields, search])

  const handleAdd = useCallback(
    (field: AvailableField) => {
      const fieldConfig: FieldConfig = {
        id: uuidv4(),
        sourceId: field.sourceId,
        tableName: field.tableName,
        columnName: field.columnName,
        label: field.label,
        type: field.type,
        isDimension: field.isDimension,
        isMeasure: field.isMeasure,
        aggregation: field.isMeasure ? 'sum' : undefined,
        visible: true,
      }
      onAddField(fieldConfig)
    },
    [onAddField]
  )

  const toggleTable = (table: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev)
      next.has(table) ? next.delete(table) : next.add(table)
      return next
    })
  }

  if (!sourceId) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        Select a data source to browse fields
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-sm text-destructive">
        Failed to load fields. Check data source connection.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 pl-7 pr-7 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto">
        <FieldSection
          title="DIMENSIONS"
          fields={dimensions}
          activeFieldIds={activeFieldIds}
          onAdd={handleAdd}
        />
        <FieldSection
          title="MEASURES"
          fields={measures}
          activeFieldIds={activeFieldIds}
          onAdd={handleAdd}
          accent
        />
      </div>
    </div>
  )
}

interface FieldSectionProps {
  title: string
  fields: AvailableField[]
  activeFieldIds: Set<string>
  onAdd: (field: AvailableField) => void
  accent?: boolean
}

function FieldSection({ title, fields, activeFieldIds, onAdd, accent }: FieldSectionProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (fields.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <span>{collapsed ? '▶' : '▼'}</span>
        <span className={cn(accent ? 'text-green-600' : 'text-blue-600')}>{title}</span>
        <Badge variant="secondary" className="ml-auto text-xs px-1 h-4">
          {fields.length}
        </Badge>
      </button>

      {!collapsed && (
        <div className="pb-2">
          {fields.map((field) => {
            const isActive = activeFieldIds.has(
              `${field.sourceId}.${field.tableName}.${field.columnName}`
            )
            return (
              <div
                key={`${field.tableName}.${field.columnName}`}
                className={cn(
                  'group flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent',
                  isActive && 'opacity-50'
                )}
              >
                <span className={cn('shrink-0', TYPE_COLORS[field.type])}>
                  {TYPE_ICONS[field.type]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{field.label}</div>
                  <div className="truncate text-muted-foreground">
                    {field.tableName}.{field.columnName}
                  </div>
                </div>
                <button
                  onClick={() => !isActive && onAdd(field)}
                  disabled={isActive}
                  className={cn(
                    'shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100',
                    isActive
                      ? 'cursor-default'
                      : 'hover:bg-primary hover:text-primary-foreground'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
