'use client'

import React, { useState } from 'react'
import { Plus, Trash2, ChevronDown, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { FilterConfig, FieldConfig, FieldType, LogicOperator } from '@/lib/query-engine/types'
import { FilterOperator } from '@/types/insightsforge'
import { v4 as uuidv4 } from 'uuid'

interface OperatorOption {
  value: FilterOperator
  label: string
  types: FieldType[]
}

const OPERATORS: OperatorOption[] = [
  { value: 'eq', label: '=', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'neq', label: '≠', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'gt', label: '>', types: ['number', 'date'] },
  { value: 'gte', label: '≥', types: ['number', 'date'] },
  { value: 'lt', label: '<', types: ['number', 'date'] },
  { value: 'lte', label: '≤', types: ['number', 'date'] },
  { value: 'contains', label: 'contains', types: ['string'] },
  { value: 'not_contains', label: 'not contains', types: ['string'] },
  { value: 'starts_with', label: 'starts with', types: ['string'] },
  { value: 'ends_with', label: 'ends with', types: ['string'] },
  { value: 'in', label: 'is in', types: ['string', 'number'] },
  { value: 'not_in', label: 'is not in', types: ['string', 'number'] },
  { value: 'between', label: 'between', types: ['number', 'date'] },
  { value: 'is_null', label: 'is null', types: ['string', 'number', 'date', 'boolean'] },
  { value: 'is_not_null', label: 'is not null', types: ['string', 'number', 'date', 'boolean'] },
]

interface FilterBuilderProps {
  filters: FilterConfig[]
  fields: FieldConfig[]
  onAdd: (filter: Omit<FilterConfig, 'id'>) => void
  onRemove: (filterId: string) => void
  onUpdate: (filterId: string, updates: Partial<FilterConfig>) => void
}

export function FilterBuilder({ filters, fields, onAdd, onRemove, onUpdate }: FilterBuilderProps) {
  const addFilter = () => {
    const firstField = fields[0]
    if (!firstField) return
    onAdd({
      fieldId: firstField.id,
      field: `${firstField.tableName}.${firstField.columnName}`,
      tableName: firstField.tableName,
      sourceId: firstField.sourceId,
      operator: 'eq',
      value: '',
      type: firstField.type,
      logicOperator: filters.length > 0 ? 'AND' : undefined,
      allowDashboardOverride: false,
    })
  }

  const addGroup = () => {
    onAdd({
      fieldId: 'group',
      field: '',
      operator: 'eq',
      value: '',
      type: 'string',
      logicOperator: filters.length > 0 ? 'AND' : undefined,
      isGroup: true,
      children: [],
      allowDashboardOverride: false,
    })
  }

  return (
    <div className="space-y-2 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">FILTERS</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={addFilter} className="h-7 text-xs" disabled={fields.length === 0}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Filter
          </Button>
          <Button size="sm" variant="ghost" onClick={addGroup} className="h-7 text-xs" disabled={fields.length === 0}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Group
          </Button>
        </div>
      </div>

      {filters.length === 0 ? (
        <div className="rounded border-2 border-dashed p-4 text-center text-xs text-muted-foreground">
          No filters applied. Click "Add Filter" to filter data.
        </div>
      ) : (
        <div className="space-y-1.5">
          {filters.map((filter, idx) => (
            <React.Fragment key={filter.id}>
              {idx > 0 && (
                <button
                  onClick={() =>
                    onUpdate(filter.id, {
                      logicOperator: filter.logicOperator === 'AND' ? 'OR' : 'AND',
                    })
                  }
                  className="mx-auto flex h-5 w-10 items-center justify-center rounded text-xs font-semibold transition-colors"
                  style={{
                    background: filter.logicOperator === 'OR' ? '#f59e0b20' : '#3b82f620',
                    color: filter.logicOperator === 'OR' ? '#d97706' : '#2563eb',
                  }}
                >
                  {filter.logicOperator ?? 'AND'}
                </button>
              )}
              {filter.isGroup ? (
                <FilterGroup
                  filter={filter}
                  fields={fields}
                  onRemove={onRemove}
                  onUpdate={onUpdate}
                />
              ) : (
                <FilterRow
                  filter={filter}
                  fields={fields}
                  onRemove={onRemove}
                  onUpdate={onUpdate}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

interface FilterRowProps {
  filter: FilterConfig
  fields: FieldConfig[]
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<FilterConfig>) => void
}

function FilterRow({ filter, fields, onRemove, onUpdate }: FilterRowProps) {
  const selectedField = fields.find((f) => f.id === filter.fieldId) ?? fields[0]
  const fieldType = selectedField?.type ?? filter.type
  const availableOps = OPERATORS.filter((op) => op.types.includes(fieldType))
  const noValueOps: FilterOperator[] = ['is_null', 'is_not_null']

  const handleFieldChange = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId)
    if (!field) return
    onUpdate(filter.id, {
      fieldId,
      field: `${field.tableName}.${field.columnName}`,
      tableName: field.tableName,
      type: field.type,
      operator: 'eq',
      value: '',
    })
  }

  return (
    <div className="group flex items-start gap-1.5 rounded border bg-card p-2">
      <div className="flex flex-1 flex-wrap items-center gap-1">
        {/* Field selector */}
        <Select value={filter.fieldId} onValueChange={handleFieldChange}>
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue placeholder="Field…" />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id} className="text-xs">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Operator */}
        <Select
          value={filter.operator}
          onValueChange={(v) => onUpdate(filter.id, { operator: v as FilterOperator })}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableOps.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value input */}
        {!noValueOps.includes(filter.operator) && (
          <FilterValueInput
            filter={filter}
            fieldType={fieldType}
            onUpdate={(updates) => onUpdate(filter.id, updates)}
          />
        )}
      </div>

      {/* Dashboard override */}
      <div className="flex items-center gap-1 mt-0.5">
        <Checkbox
          checked={filter.allowDashboardOverride ?? false}
          onCheckedChange={(v) => onUpdate(filter.id, { allowDashboardOverride: !!v })}
          id={`override-${filter.id}`}
          className="h-3 w-3"
        />
        <label htmlFor={`override-${filter.id}`} className="text-xs text-muted-foreground cursor-pointer">
          Override
        </label>
      </div>

      {/* Remove */}
      <button
        onClick={() => onRemove(filter.id)}
        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive mt-0.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

interface FilterValueInputProps {
  filter: FilterConfig
  fieldType: FieldType
  onUpdate: (updates: Partial<FilterConfig>) => void
}

function FilterValueInput({ filter, fieldType, onUpdate }: FilterValueInputProps) {
  if (filter.operator === 'between') {
    return (
      <div className="flex items-center gap-1">
        <Input
          placeholder="Min"
          value={String(filter.value ?? '')}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="h-7 w-20 text-xs"
          type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
        />
        <span className="text-xs text-muted-foreground">–</span>
        <Input
          placeholder="Max"
          value={String(filter.value2 ?? '')}
          onChange={(e) => onUpdate({ value2: e.target.value })}
          className="h-7 w-20 text-xs"
          type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
        />
      </div>
    )
  }

  if (filter.operator === 'in' || filter.operator === 'not_in') {
    const values = Array.isArray(filter.value) ? (filter.value as string[]) : []
    return (
      <div className="flex flex-wrap items-center gap-1">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="text-xs gap-1 px-1.5">
            {v}
            <button
              onClick={() => onUpdate({ value: values.filter((_, j) => j !== i) })}
              className="hover:text-destructive"
            >
              ×
            </button>
          </Badge>
        ))}
        <Input
          placeholder="Add value…"
          className="h-7 w-24 text-xs"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              const val = (e.target as HTMLInputElement).value.trim()
              if (val) {
                onUpdate({ value: [...values, val] });
                (e.target as HTMLInputElement).value = ''
              }
            }
          }}
        />
      </div>
    )
  }

  if (fieldType === 'boolean') {
    return (
      <Select
        value={String(filter.value)}
        onValueChange={(v) => onUpdate({ value: v === 'true' })}
      >
        <SelectTrigger className="h-7 w-20 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true" className="text-xs">True</SelectItem>
          <SelectItem value="false" className="text-xs">False</SelectItem>
        </SelectContent>
      </Select>
    )
  }

  return (
    <Input
      placeholder="Value…"
      value={String(filter.value ?? '')}
      onChange={(e) => onUpdate({ value: e.target.value })}
      className="h-7 w-36 text-xs"
      type={
        fieldType === 'number'
          ? 'number'
          : fieldType === 'date'
          ? 'date'
          : 'text'
      }
    />
  )
}

interface FilterGroupProps {
  filter: FilterConfig
  fields: FieldConfig[]
  onRemove: (id: string) => void
  onUpdate: (id: string, updates: Partial<FilterConfig>) => void
}

function FilterGroup({ filter, fields, onRemove, onUpdate }: FilterGroupProps) {
  const [expanded, setExpanded] = useState(true)
  const children = filter.children ?? []

  const addChild = () => {
    const firstField = fields[0]
    if (!firstField) return
    const newChild: FilterConfig = {
      id: uuidv4(),
      fieldId: firstField.id,
      field: `${firstField.tableName}.${firstField.columnName}`,
      operator: 'eq',
      value: '',
      type: firstField.type,
      logicOperator: children.length > 0 ? 'AND' : undefined,
    }
    onUpdate(filter.id, { children: [...children, newChild] })
  }

  const removeChild = (childId: string) => {
    onUpdate(filter.id, { children: children.filter((c) => c.id !== childId) })
  }

  const updateChild = (childId: string, updates: Partial<FilterConfig>) => {
    onUpdate(filter.id, {
      children: children.map((c) => (c.id === childId ? { ...c, ...updates } : c)),
    })
  }

  return (
    <div className="rounded border-2 border-dashed border-muted bg-muted/20 p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded((e) => !e)} className="text-muted-foreground">
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', !expanded && '-rotate-90')} />
          </button>
          <span className="text-xs font-semibold text-muted-foreground">
            GROUP ({children.length} conditions)
          </span>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={addChild} className="h-5 text-xs px-1.5">
            <Plus className="h-3 w-3" />
          </Button>
          <button
            onClick={() => onRemove(filter.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-1.5 pl-2">
          {children.map((child, idx) => (
            <React.Fragment key={child.id}>
              {idx > 0 && (
                <button
                  onClick={() =>
                    updateChild(child.id, {
                      logicOperator: child.logicOperator === 'AND' ? 'OR' : 'AND',
                    })
                  }
                  className="mx-auto flex h-5 w-10 items-center justify-center rounded text-xs font-semibold"
                  style={{
                    background: child.logicOperator === 'OR' ? '#f59e0b20' : '#3b82f620',
                    color: child.logicOperator === 'OR' ? '#d97706' : '#2563eb',
                  }}
                >
                  {child.logicOperator ?? 'AND'}
                </button>
              )}
              <FilterRow
                filter={child}
                fields={fields}
                onRemove={removeChild}
                onUpdate={updateChild}
              />
            </React.Fragment>
          ))}
          {children.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-2">
              No conditions in group
            </div>
          )}
        </div>
      )}
    </div>
  )
}
